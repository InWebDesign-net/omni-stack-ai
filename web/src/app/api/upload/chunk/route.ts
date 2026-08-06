import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const uploadId = (formData.get('uploadId') as string) || `upload_${Date.now()}`;
    const chunkIndex = parseInt((formData.get('chunkIndex') as string) || '0', 10);
    const totalChunks = parseInt((formData.get('totalChunks') as string) || '1', 10);
    const title = (formData.get('title') as string) || 'Neues Video';
    const mediaType = (formData.get('mediaType') as string) || 'video';
    const fileChunk = formData.get('file') as Blob | null;

    if (!fileChunk) {
      return NextResponse.json({ error: 'No file chunk uploaded' }, { status: 400 });
    }

    const inDir = '/root/media/in';
    fs.mkdirSync(inDir, { recursive: true });

    const tempFilePath = path.join(inDir, `${uploadId}.tmp`);
    const arrayBuffer = await fileChunk.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Append chunk buffer to temp file
    fs.appendFileSync(tempFilePath, buffer);

    const isComplete = chunkIndex === totalChunks - 1;

    if (isComplete) {
      // Generate clean slug from title & uploadId
      const cleanSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `video-${Date.now()}`;
      
      const finalRawPath = path.join(inDir, `${cleanSlug}.mp4`);
      
      // Rename temp file to final raw video path in /root/media/in
      if (fs.existsSync(finalRawPath)) {
        fs.unlinkSync(finalRawPath);
      }
      fs.renameSync(tempFilePath, finalRawPath);

      const userIdStr = formData.get('userId') as string | null;
      const userId = userIdStr ? parseInt(userIdStr, 10) : null;

      // 1. Create Standalone Video entity in Strapi
      const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (process.env.STRAPI_API_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
      }

      let createdVideoDocId = null;
      try {
        const videoPayload: any = {
          title,
          slug: cleanSlug,
          mp4Url: `/media/videos/${cleanSlug}.mp4`,
          hlsUrl: `/media/videos/hls/${cleanSlug}/master.m3u8`,
          thumbnailUrl: `/media/thumbnails/${cleanSlug}-1.png`,
          ogImageUrl: `/media/og/${cleanSlug}.jpg`,
          isProcessing: true,
          isForSale: false,
          price: 0,
          publishedAt: new Date().toISOString(),
        };
        if (userId) {
          videoPayload.creator = userId;
        }

        const videoRes = await fetch(`${strapiUrl}/api/videos`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ data: videoPayload }),
        });
        if (videoRes.ok) {
          const vData = await videoRes.json();
          createdVideoDocId = vData?.data?.documentId || null;
        }
      } catch (e) {}

      // 2. Create FeedItem referencing the standalone Video & User Author
      const feedItemPayload: any = {
        title,
        slug: cleanSlug,
        summary: 'Video wird verarbeitet...',
        content: 'Das Video befindet sich im Konvertierungsprozess (HLS ABR Stream).',
        mediaType: 'video',
        mediaUrl: `/media/videos/${cleanSlug}.mp4`,
        thumbnailUrl: `/media/thumbnails/${cleanSlug}-1.png`,
        tags: ['Community', 'Video', 'Neu'],
        isProcessing: true,
        video: createdVideoDocId,
        publishedAt: new Date().toISOString(),
      };
      if (userId) {
        feedItemPayload.author = userId;
      }

      const createRes = await fetch(`${strapiUrl}/api/feed-items`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data: feedItemPayload }),
      });

      let createdData = null;
      if (createRes.ok) {
        createdData = await createRes.json();
      }

      return NextResponse.json({
        success: true,
        isComplete: true,
        slug: cleanSlug,
        documentId: createdData?.data?.documentId || null,
        isProcessing: true,
        message: 'Upload abgeschlossen. Video wurde zur Konvertierung eingereiht.',
      });
    }

    return NextResponse.json({
      success: true,
      isComplete: false,
      chunkIndex,
      totalChunks,
      progress: Math.round(((chunkIndex + 1) / totalChunks) * 100),
    });
  } catch (error: any) {
    console.error('Chunk upload error:', error);
    return NextResponse.json({ error: error.message || 'Chunk upload failed' }, { status: 500 });
  }
}

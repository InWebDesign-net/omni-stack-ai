import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const rawUploadId = (formData.get('uploadId') as string) || `upload_${Date.now()}`;
    const uploadId = rawUploadId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!uploadId) {
      return NextResponse.json({ error: 'Invalid uploadId' }, { status: 400 });
    }
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
      // Generate clean, unique collision-free slug from title & timestamp/hash
      const isImage = mediaType === 'image';
      const defaultPrefix = isImage ? 'image' : 'video';
      const baseSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || defaultPrefix;
      
      const uniqueHash = Math.random().toString(36).substring(2, 7);
      const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}-${uniqueHash}`;
      
      const rawExt = isImage ? '.img' : '.mp4';
      const finalRawPath = path.join(inDir, `${uniqueSlug}${rawExt}`);
      
      // Rename temp file to final raw path in /root/media/in
      if (fs.existsSync(finalRawPath)) {
        fs.unlinkSync(finalRawPath);
      }
      fs.renameSync(tempFilePath, finalRawPath);

      const userIdStr = formData.get('userId') as string | null;
      const userId = userIdStr ? parseInt(userIdStr, 10) : null;

      const tagsStr = formData.get('tags') as string | null;
      let defaultTags = isImage ? ['Architektur', 'Fotografie', 'Bild'] : ['Wissenschaft', 'Technologie', 'Video'];
      let parsedTags: string[] = defaultTags;
      if (tagsStr) {
        try {
          const raw = JSON.parse(tagsStr);
          if (Array.isArray(raw) && raw.length > 0) parsedTags = raw;
        } catch (e) {
          const split = tagsStr.split(',').map((s) => s.trim()).filter(Boolean);
          if (split.length > 0) parsedTags = split;
        }
      }

      // Create bilingual entity via Strapi backend endpoint
      const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
      const authHeader = req.headers.get('authorization');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authHeader) {
        headers['Authorization'] = authHeader;
      } else if (process.env.STRAPI_API_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
      }

      let createdDocId = null;
      const createEndpoint = isImage ? `${strapiUrl}/api/feed/create-image` : `${strapiUrl}/api/feed/create-video`;
      try {
        const createRes = await fetch(createEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title,
            slug: uniqueSlug,
            tags: parsedTags,
            userId: userId,
          }),
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          createdDocId = createData?.documentId || null;
        }
      } catch (e) {
        console.error('Failed to create bilingual media entry:', e);
      }

      return NextResponse.json({
        success: true,
        isComplete: true,
        slug: uniqueSlug,
        documentId: createdDocId,
        isProcessing: true,
        message: `Upload abgeschlossen. ${isImage ? 'Bild' : 'Video'} wurde zur Konvertierung eingereiht.`,
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

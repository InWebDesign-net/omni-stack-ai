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
      // Generate clean, unique collision-free slug from title & timestamp/hash
      const baseSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'video';
      
      const uniqueHash = Math.random().toString(36).substring(2, 7);
      const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}-${uniqueHash}`;
      
      const finalRawPath = path.join(inDir, `${uniqueSlug}.mp4`);
      
      // Rename temp file to final raw video path in /root/media/in
      if (fs.existsSync(finalRawPath)) {
        fs.unlinkSync(finalRawPath);
      }
      fs.renameSync(tempFilePath, finalRawPath);

      const userIdStr = formData.get('userId') as string | null;
      const userId = userIdStr ? parseInt(userIdStr, 10) : null;

      // Create bilingual Video entity via Strapi backend endpoint
      // This calls the feed controller's createVideo action which uses the Document Service API
      // to properly create EN + DE locale entries linked via documentId, both published.
      const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (process.env.STRAPI_API_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
      }

      let createdVideoDocId = null;
      try {
        const createRes = await fetch(`${strapiUrl}/api/feed/create-video`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title,
            slug: uniqueSlug,
            tags: ['Community', 'Video', 'Neu'],
            userId: userId,
          }),
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          createdVideoDocId = createData?.documentId || null;
        }
      } catch (e) {
        console.error('Failed to create bilingual video entry:', e);
      }

      return NextResponse.json({
        success: true,
        isComplete: true,
        slug: uniqueSlug,
        documentId: createdVideoDocId,
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

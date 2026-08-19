import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function strapiBase() {
  return process.env.STRAPI_URL || 'http://127.0.0.1:1337';
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob | File | null;
    const folderParam = (formData.get('folder') as string) || 'avatars';
    const folder = folderParam.replace(/[^a-zA-Z0-9_-]/g, '') || 'avatars';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileExt = path.extname((file as File).name || 'image.png').toLowerCase() || '.png';
    const uniqueSlug = `${folder}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${fileExt}`;

    const mediaOutDir = path.join('/root/media/out', folder);
    fs.mkdirSync(mediaOutDir, { recursive: true });

    const localFilePath = path.join(mediaOutDir, uniqueSlug);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(localFilePath, buffer);

    const publicUrl = `/media/out/${folder}/${uniqueSlug}`;

    // Optionally register in Strapi upload library
    try {
      const strapiToken = process.env.STRAPI_API_TOKEN || process.env.STRAPI_TOKEN;
      if (strapiToken) {
        const strapiFormData = new FormData();
        strapiFormData.append('files', new Blob([buffer], { type: file.type || 'image/png' }), (file as File).name || uniqueSlug);

        await fetch(`${strapiBase()}/api/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${strapiToken}`,
          },
          body: strapiFormData,
        });
      }
    } catch (strapiErr) {
      console.warn('Strapi upload sync warning:', strapiErr);
    }

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: any) {
    console.error('Direct image upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}

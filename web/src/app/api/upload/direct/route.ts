import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

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

    // Target folder directly under /root/media (e.g. /root/media/avatars)
    const targetDir = path.join('/root/media', folder);
    fs.mkdirSync(targetDir, { recursive: true });

    const localFilePath = path.join(targetDir, uniqueSlug);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(localFilePath, buffer);

    // Public URL accessible via Next.js /media/[...path] route
    const publicUrl = `/media/${folder}/${uniqueSlug}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: any) {
    console.error('Direct image upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCurrentUserFromCookies } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

/** Image types this endpoint accepts, mapped to the extension we store them under. */
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    // This writes a file into the media root and hands back a URL on our own
    // domain, so it must belong to someone. It previously accepted an
    // `Authorization` header and never looked at it, which left an
    // unauthenticated write open to anyone who found the path.
    const { user } = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as Blob | File | null;
    const folderParam = (formData.get('folder') as string) || 'avatars';
    const folder = folderParam.replace(/[^a-zA-Z0-9_-]/g, '') || 'avatars';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    // The extension comes from our own allow-list, not from the uploaded
    // filename. Taking it from the client meant a caller could choose `.html`
    // or `.svg` and have it served back from our origin, where the browser
    // would run any script inside it as us.
    const fileExt = ALLOWED_TYPES[file.type];
    if (!fileExt) {
      return NextResponse.json(
        { error: 'Unsupported file type. Allowed: PNG, JPEG, WebP, GIF.' },
        { status: 415 },
      );
    }

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

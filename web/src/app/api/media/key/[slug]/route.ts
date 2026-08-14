import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const MEDIA_ROOT = path.resolve('/root/media');

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Sanitize slug
    const cleanSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '');

    // Check key location across possible storage paths
    const candidatePaths = [
      path.join(MEDIA_ROOT, 'videos', 'hls', cleanSlug, 'enc.key'),
      path.join(MEDIA_ROOT, 'hls', cleanSlug, 'enc.key'),
      path.join(MEDIA_ROOT, 'out', 'hls', cleanSlug, 'enc.key'),
      path.join(MEDIA_ROOT, 'keys', `${cleanSlug}.key`),
    ];

    let targetKeyPath = candidatePaths.find((p) => fs.existsSync(p));

    if (!targetKeyPath) {
      return new NextResponse('AES Key Not Found', { status: 404 });
    }

    const keyBuffer = fs.readFileSync(targetKeyPath);

    return new NextResponse(keyBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': keyBuffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    console.error('Error serving AES HLS key:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    case '.mp4':
      return 'video/mp4';
    case '.m3u8':
      return 'application/x-mpegURL';
    case '.ts':
      return 'video/mp2t';
    case '.json':
      return 'application/json';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];
    const relativePath = pathSegments.join('/');

    const filePath = path.join('/root/media', relativePath);

    // Prevent directory traversal attacks
    if (!filePath.startsWith('/root/media')) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const contentType = getMimeType(filePath);
      const fileBuffer = fs.readFileSync(filePath);

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    return new NextResponse('File not found', { status: 404 });
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

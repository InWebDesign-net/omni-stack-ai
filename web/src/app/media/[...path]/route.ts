import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveVideoAccess, videoSlugForMediaPath } from '@/lib/video-access';

export const dynamic = 'force-dynamic';

const MEDIA_ROOT = path.resolve('/root/media');

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

// Convert a Node.js ReadStream to a Web ReadableStream
function nodeStreamToWebStream(nodeStream: fs.ReadStream): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        controller.enqueue(new Uint8Array(buffer));
      });
      nodeStream.on('end', () => {
        controller.close();
      });
      nodeStream.on('error', (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];
    const relativePath = pathSegments.join('/');

    // Raw MP4 renditions are unencrypted, so they need the same visibility check
    // as the AES key. Thumbnails, OG images and avatars stay public; HLS segments
    // are encrypted on disk and gated via the key endpoint instead.
    const governingSlug = videoSlugForMediaPath(pathSegments);
    if (governingSlug) {
      const access = await resolveVideoAccess(governingSlug);
      if (!access.allowed) {
        return new NextResponse(access.reason, { status: access.status });
      }
    }

    const resolvedPath = path.resolve(path.join(MEDIA_ROOT, relativePath));
    const mediaRootWithSep = MEDIA_ROOT.endsWith(path.sep) ? MEDIA_ROOT : MEDIA_ROOT + path.sep;

    // Security: Prevent directory traversal attack
    if (!resolvedPath.startsWith(mediaRootWithSep) && resolvedPath !== MEDIA_ROOT) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    if (!fs.existsSync(resolvedPath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      return new NextResponse('Not a file', { status: 404 });
    }

    const fileSize = stat.size;
    const contentType = getMimeType(resolvedPath);
    const rangeHeader = req.headers.get('range');

    // Handle Range Requests (HTTP 206 Partial Content)
    if (rangeHeader && rangeHeader.startsWith('bytes=')) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse('Requested range not satisfiable', {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const nodeStream = fs.createReadStream(resolvedPath, { start, end });
      const webStream = nodeStreamToWebStream(nodeStream);

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Full File Request (HTTP 200 OK) using Streaming
    const nodeStream = fs.createReadStream(resolvedPath);
    const webStream = nodeStreamToWebStream(nodeStream);

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize.toString(),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Error serving media file stream:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

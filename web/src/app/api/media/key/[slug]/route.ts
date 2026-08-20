import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveVideoAccess, sanitizeSlug } from '@/lib/video-access';

export const dynamic = 'force-dynamic';

const MEDIA_ROOT = path.resolve('/root/media');

// Rate limiting via globalThis (persists across requests in the same Node.js process)
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX = 10;

interface RateEntry { count: number; resetAt: number; }

// Use globalThis to persist rate limit state across requests
const globalForRateLimit = globalThis as unknown as {
  rateLimitMap?: Map<string, RateEntry>;
};

if (!globalForRateLimit.rateLimitMap) {
  globalForRateLimit.rateLimitMap = new Map();
}
const rateMap = globalForRateLimit.rateLimitMap;

function isRateLimited(ip: string, slug: string): boolean {
  const key = `${ip}:${slug}`;
  const now = Date.now();
  const entry = rateMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_MAX) {
    return true;
  }

  entry.count++;
  return false;
}

// Cleanup old entries every 5 minutes
const globalForCleanup = globalThis as unknown as {
  rateLimitCleanup?: ReturnType<typeof setInterval>;
};
if (!globalForCleanup.rateLimitCleanup) {
  globalForCleanup.rateLimitCleanup = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of rateMap) {
      if (now > v.resetAt) rateMap.delete(k);
    }
  }, 300_000);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Rate limiting per IP + slug
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    if (isRateLimited(clientIp, slug)) {
      return new NextResponse('Rate limit exceeded', {
        status: 429,
        headers: { 'Retry-After': '60' },
      });
    }

    // Sanitize slug
    const cleanSlug = sanitizeSlug(slug);

    // Authorization: the video's own visibility decides. Published videos stay
    // playable for anonymous visitors; private ones only for their owner.
    const access = await resolveVideoAccess(cleanSlug);
    if (!access.allowed) {
      return new NextResponse(access.reason, { status: access.status });
    }

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

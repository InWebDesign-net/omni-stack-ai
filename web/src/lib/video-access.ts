import { getCurrentUserFromCookies } from '@/lib/auth-server';

/**
 * Central authorization for video source material (AES keys and raw MP4 files).
 *
 * The rule is driven by the video's own `visibility` field rather than by whether
 * a session exists, so published videos stay playable for anonymous visitors while
 * private ones never hand out anything a player could decode.
 *
 * Used by:
 *  - `app/api/media/key/[slug]/route.ts` — the AES-128 key referenced by every
 *    variant playlist (`#EXT-X-KEY ... URI="/api/media/key/<slug>"`)
 *  - `app/media/[...path]/route.ts` — the unencrypted MP4 renditions
 *
 * HLS *segments* are deliberately not gated: they are AES-encrypted on disk and
 * unplayable without the key, so gating the key is what makes the encryption real.
 * Adding a Strapi round-trip per segment would cost far more than it protects.
 */

export type VideoAccessDecision =
  | { allowed: true }
  | { allowed: false; status: 401 | 403 | 404; reason: string };

interface VideoMeta {
  visibility: string;
  creatorId: number | null;
}

/**
 * Public videos are cached briefly to keep playback start cheap. Non-public
 * results are never cached: their lookup depends on who is asking, so a cached
 * entry could leak an owner's decision to the next caller.
 */
const PUBLIC_META_TTL_MS = 30_000;

const globalForVideoMeta = globalThis as unknown as {
  videoMetaCache?: Map<string, { meta: VideoMeta; expiresAt: number }>;
};
if (!globalForVideoMeta.videoMetaCache) {
  globalForVideoMeta.videoMetaCache = new Map();
}
const metaCache = globalForVideoMeta.videoMetaCache;

/** Strip anything that could escape the slug position of a path or query. */
export function sanitizeSlug(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '');
}

async function loadVideoMeta(slug: string, viewerId: number | null): Promise<VideoMeta | null> {
  const cached = metaCache.get(slug);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.meta;
  }

  const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (process.env.STRAPI_API_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
  }
  // Lets the document-service middleware resolve the viewer, so an owner can
  // still reach their own private video (see docs/OMNI_VIEWER.md).
  if (viewerId != null) {
    headers['x-omni-user-id'] = String(viewerId);
  }

  const url =
    `${strapiUrl}/api/videos` +
    `?filters[slug][$eq]=${encodeURIComponent(slug)}` +
    `&fields[0]=visibility&populate[creator][fields][0]=id&locale=*`;

  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) {
    console.error(`[video-access] Strapi lookup for "${slug}" failed: ${res.status}`);
    return null;
  }

  const body = await res.json();
  const entry = body?.data?.[0];
  if (!entry) {
    return null;
  }

  // `visibility` is not localized, so any locale row carries the same value.
  const meta: VideoMeta = {
    visibility: entry.visibility || 'private',
    creatorId: entry.creator?.id ?? null,
  };

  if (meta.visibility === 'public' || meta.visibility === 'unlisted') {
    metaCache.set(slug, { meta, expiresAt: Date.now() + PUBLIC_META_TTL_MS });
  }

  return meta;
}

async function checkUserSubscribedToCreator(userId: number, creatorId: number): Promise<boolean> {
  try {
    const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
    }
    const url = `${strapiUrl}/api/subscriptions?filters[subscriber][id][$eq]=${userId}&filters[targetUser][id][$eq]=${creatorId}&filters[type][$eq]=channel`;
    const res = await fetch(url, { headers, cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data?.data) && data.data.length > 0;
  } catch (err) {
    console.error(`[video-access] subscription check error:`, err);
    return false;
  }
}

export async function resolveVideoAccess(rawSlug: string): Promise<VideoAccessDecision> {
  const slug = sanitizeSlug(rawSlug);
  if (!slug) {
    return { allowed: false, status: 404, reason: 'empty slug' };
  }

  const { user } = await getCurrentUserFromCookies();
  const meta = await loadVideoMeta(slug, user?.id ?? null);

  // Either the video does not exist, or default-deny hid it from this caller.
  // Both answer the same way so the endpoint cannot be used to probe for
  // the existence of private slugs.
  if (!meta) {
    return { allowed: false, status: 404, reason: 'not found' };
  }

  if (meta.visibility === 'public' || meta.visibility === 'unlisted') {
    return { allowed: true };
  }

  if (!user) {
    return { allowed: false, status: 401, reason: 'authentication required' };
  }

  if (meta.creatorId != null && meta.creatorId === user.id) {
    return { allowed: true };
  }

  if (meta.visibility === 'subscribers') {
    if (meta.creatorId != null) {
      const isSubscribed = await checkUserSubscribedToCreator(user.id, meta.creatorId);
      if (isSubscribed) {
        return { allowed: true };
      }
    }
    return { allowed: false, status: 403, reason: 'subscribers only' };
  }

  return { allowed: false, status: 403, reason: 'not the owner of this video' };
}

/**
 * Maps a path under `/media/...` to the video slug that governs it, or null when
 * the path is not video source material (thumbnails, OG images, avatars, images).
 */
export function videoSlugForMediaPath(segments: string[]): string | null {
  // /media/mp4/<slug>.mp4 — unencrypted rendition
  if (segments.length === 2 && segments[0] === 'mp4' && segments[1].endsWith('.mp4')) {
    return sanitizeSlug(segments[1].slice(0, -'.mp4'.length));
  }

  // /media/videos/<slug>.mp4 — the path stored in `video.mp4Url`
  if (segments.length === 2 && segments[0] === 'videos' && segments[1].endsWith('.mp4')) {
    return sanitizeSlug(segments[1].slice(0, -'.mp4'.length));
  }

  return null;
}

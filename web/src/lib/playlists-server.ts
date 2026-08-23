import 'server-only';

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

export interface PlaylistVideo {
  id: number;
  documentId: string;
  slug: string;
  title: string;
  thumbnailUrl?: string;
  duration?: number;
  visibility?: string;
  creator?: { id: number; username?: string };
}

export interface Playlist {
  id: number;
  documentId: string;
  title: string;
  slug?: string;
  description?: string;
  thumbnailUrl?: string;
  visibility: string;
  owner?: { id: number; username?: string };
  videos: PlaylistVideo[];
  /** Items the viewer may not see, dropped from `videos`. Owners see 0. */
  hiddenCount: number;
}

function strapiHeaders(viewerId?: number | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (STRAPI_API_TOKEN) headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`;
  // The visibility middleware scopes to this viewer. Without it the API token
  // reads as anonymous and the owner cannot see their own private lists.
  if (viewerId != null) headers['x-omni-user-id'] = String(viewerId);
  return headers;
}

export function strapiUrl(path: string): string {
  return `${STRAPI_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * The fields a playlist's videos are read with.
 *
 * More than the panel beside the player needs, because the vertical feed reads
 * the same payload and has to be able to *play* them — without `hlsUrl` and
 * `mp4Url` it renders a list of items with no source. Kept in one place so the
 * two consumers cannot drift apart.
 */
const VIDEO_FIELDS = [
  'title', 'slug', 'thumbnailUrl', 'duration', 'visibility',
  'hlsUrl', 'mp4Url', 'summary', 'tags', 'likesCount', 'viewsCount', 'commentsCount',
];

const ENTRY_POPULATE =
  VIDEO_FIELDS.map((f, i) => `populate[entries][populate][video][fields][${i}]=${f}`).join('&') +
  '&populate[entries][populate][video][populate][creator][fields][0]=username' +
  '&populate[owner][fields][0]=username';

/**
 * The videos of a playlist that this viewer is allowed to see, in order.
 *
 * The document-service middleware guards `findMany`/`findOne` on videos, but it
 * does **not** filter a relation populated from another type. Measured: an
 * anonymous caller reading a public playlist got back the title and visibility
 * of a private video inside it. So a playlist cannot be allowed to publish its
 * items by containing them — the ids are collected here and looked up again
 * through the guarded path, and only what comes back is returned.
 *
 * Order is the playlist's, not the lookup's: the entries carry it and the
 * second query does not preserve it.
 */
async function visibleVideosInOrder(
  entries: any[],
  viewerId?: number | null
): Promise<{ videos: PlaylistVideo[]; hiddenCount: number }> {
  const ordered = (entries || [])
    .map((entry) => entry?.video)
    .filter(Boolean) as any[];

  if (ordered.length === 0) return { videos: [], hiddenCount: 0 };

  const documentIds = ordered.map((v) => v.documentId).filter(Boolean);
  const params = new URLSearchParams();
  documentIds.forEach((id, i) => params.set(`filters[documentId][$in][${i}]`, id));
  params.set('pagination[pageSize]', String(Math.max(documentIds.length, 1)));
  VIDEO_FIELDS.forEach((f, i) => params.set(`fields[${i}]`, f));
  params.set('populate[creator][fields][0]', 'username');

  const res = await fetch(strapiUrl(`/api/videos?${params.toString()}`), {
    headers: strapiHeaders(viewerId),
    cache: 'no-store',
  });

  if (!res.ok) {
    // A failed lookup must not fall back to the unfiltered relation — that is
    // the leak this function exists to close.
    return { videos: [], hiddenCount: ordered.length };
  }

  const json = await res.json();
  const allowed = new Map<string, any>();
  for (const v of json?.data || []) allowed.set(v.documentId, v);

  const videos = ordered
    .filter((v) => allowed.has(v.documentId))
    .map((v) => ({ ...allowed.get(v.documentId), id: allowed.get(v.documentId).id }));

  return { videos, hiddenCount: ordered.length - videos.length };
}

/**
 * A video by `documentId`, through the guarded path.
 *
 * Used before adding one to a playlist: the lookup runs with the caller's
 * identity, so a video they are not allowed to see comes back empty and cannot
 * be put into a list by anyone who happens to know its id.
 */
export async function resolveVideoByDocumentId(documentId: string, viewerId?: number | null) {
  const params = new URLSearchParams();
  params.set('filters[documentId][$eq]', documentId);
  params.set('fields[0]', 'title');
  params.set('pagination[pageSize]', '1');

  const res = await fetch(strapiUrl(`/api/videos?${params.toString()}`), {
    headers: strapiHeaders(viewerId),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = await res.json();
  return (json?.data || [])[0] || null;
}

export async function fetchPlaylist(
  documentId: string,
  viewerId?: number | null
): Promise<Playlist | null> {
  const res = await fetch(strapiUrl(`/api/playlists/${documentId}?${ENTRY_POPULATE}`), {
    headers: strapiHeaders(viewerId),
    cache: 'no-store',
  });
  if (!res.ok) return null;

  const data = (await res.json())?.data;
  if (!data) return null;

  const { videos, hiddenCount } = await visibleVideosInOrder(data.entries, viewerId);
  return { ...data, videos, hiddenCount, entries: undefined } as Playlist;
}

export async function fetchPlaylistsForOwner(
  ownerId: number,
  viewerId?: number | null
): Promise<Playlist[]> {
  const params = new URLSearchParams();
  params.set('filters[owner][id][$eq]', String(ownerId));
  params.set('sort', 'updatedAt:desc');
  params.set('pagination[pageSize]', '100');

  const res = await fetch(
    strapiUrl(`/api/playlists?${params.toString()}&${ENTRY_POPULATE}`),
    { headers: strapiHeaders(viewerId), cache: 'no-store' }
  );
  if (!res.ok) return [];

  const json = await res.json();
  const out: Playlist[] = [];
  for (const item of json?.data || []) {
    const { videos, hiddenCount } = await visibleVideosInOrder(item.entries, viewerId);
    out.push({ ...item, videos, hiddenCount, entries: undefined } as Playlist);
  }
  return out;
}

/**
 * The playlist, if this user owns it. Used to gate every mutation.
 *
 * The BFF talks to Strapi with a full-access token, so nothing downstream will
 * refuse a write on the caller's behalf — ownership has to be established here
 * or not at all.
 */
export async function loadOwnedPlaylist(documentId: string, userId: number) {
  // ENTRY_POPULATE already populates the owner. Naming it twice makes Strapi
  // read `fields` as an array of arrays and answer 400 — which this function
  // would have reported as "not yours".
  const res = await fetch(
    strapiUrl(`/api/playlists/${documentId}?${ENTRY_POPULATE}`),
    { headers: strapiHeaders(userId), cache: 'no-store' }
  );
  if (!res.ok) return null;
  const data = (await res.json())?.data;
  if (!data) return null;
  if (String(data?.owner?.id) !== String(userId)) return null;
  return data;
}

export async function writePlaylist(documentId: string, payload: Record<string, unknown>, userId: number) {
  return fetch(strapiUrl(`/api/playlists/${documentId}`), {
    method: 'PUT',
    headers: strapiHeaders(userId),
    body: JSON.stringify({ data: payload }),
  });
}

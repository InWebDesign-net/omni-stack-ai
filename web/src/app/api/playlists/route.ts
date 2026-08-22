import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth-server';
import { fetchPlaylistsForOwner, strapiUrl } from '@/lib/playlists-server';

/**
 * The caller's own playlists, or a given user's.
 *
 * Without `userId` this answers "my lists", which is what the profile tab and
 * the add-to-playlist overlay both need. With one it answers "that user's
 * lists", and the visibility middleware decides what that means — a stranger
 * sees the public ones, the owner sees all of theirs.
 */
export async function GET(req: NextRequest) {
  const { user } = await getCurrentUserFromCookies();
  const requestedId = req.nextUrl.searchParams.get('userId');
  const ownerId = requestedId ? Number(requestedId) : user?.id;

  if (!ownerId) return NextResponse.json({ playlists: [] });

  const playlists = await fetchPlaylistsForOwner(ownerId, user?.id ?? null);
  return NextResponse.json({ playlists });
}

export async function POST(req: NextRequest) {
  const { user } = await getCurrentUserFromCookies();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const visibility = ['private', 'unlisted', 'subscribers', 'public'].includes(body.visibility)
    ? body.visibility
    : 'private';

  const res = await fetch(strapiUrl('/api/playlists'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({
      data: {
        title: title.slice(0, 120),
        description: typeof body.description === 'string' ? body.description.slice(0, 1000) : undefined,
        // Private unless asked otherwise: a list someone builds for themselves
        // should not become public by default, and publishing is a deliberate act.
        visibility,
        owner: user.id,
        entries: [],
      },
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Could not create playlist' }, { status: res.status });
  }

  const created = (await res.json())?.data;
  return NextResponse.json({ playlist: { ...created, videos: [], hiddenCount: 0 } }, { status: 201 });
}

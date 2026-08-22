import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth-server';
import { fetchPlaylist, loadOwnedPlaylist, strapiUrl, writePlaylist } from '@/lib/playlists-server';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { user } = await getCurrentUserFromCookies();

  const playlist = await fetchPlaylist(id, user?.id ?? null);
  if (!playlist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ playlist });
}

/** Title, description, thumbnail and visibility. Owner only. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { user } = await getCurrentUserFromCookies();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const owned = await loadOwnedPlaylist(id, user.id);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const payload: Record<string, unknown> = {};

  if (typeof body.title === 'string' && body.title.trim()) payload.title = body.title.trim().slice(0, 120);
  if (typeof body.description === 'string') payload.description = body.description.slice(0, 1000);
  if (typeof body.thumbnailUrl === 'string') payload.thumbnailUrl = body.thumbnailUrl;
  if (['private', 'unlisted', 'subscribers', 'public'].includes(body.visibility)) {
    payload.visibility = body.visibility;
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const res = await writePlaylist(id, payload, user.id);
  if (!res.ok) return NextResponse.json({ error: 'Update failed' }, { status: res.status });

  const playlist = await fetchPlaylist(id, user.id);
  return NextResponse.json({ playlist });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { user } = await getCurrentUserFromCookies();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const owned = await loadOwnedPlaylist(id, user.id);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // documentId, not the numeric id: Strapi 5 answers 200 to the latter and
  // deletes nothing.
  const res = await fetch(strapiUrl(`/api/playlists/${id}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` },
  });

  if (!res.ok && res.status !== 204) {
    return NextResponse.json({ error: 'Delete failed' }, { status: res.status });
  }
  return NextResponse.json({ success: true });
}

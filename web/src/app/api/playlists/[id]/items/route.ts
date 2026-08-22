import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth-server';
import { fetchPlaylist, loadOwnedPlaylist, resolveVideoByDocumentId, strapiUrl, writePlaylist } from '@/lib/playlists-server';

type Ctx = { params: Promise<{ id: string }> };

/** The entry list as Strapi wants it back: a plain array of video ids, in order. */
function toEntries(videoIds: (number | string)[]) {
  return videoIds.map((video) => ({ video }));
}

/**
 * The playlist's current entries as `{ id, documentId }`.
 *
 * Both are needed and they are not interchangeable: Strapi wants the numeric id
 * to write a relation, while `documentId` is the only identifier stable across
 * locales. Videos here are bilingual, so the German and English rows of one
 * video carry different numeric ids — matching on those made a video look
 * absent from a list it was already in, depending on which language the page
 * was rendered in.
 */
function currentEntries(owned: any): { id: number; documentId: string }[] {
  return (owned?.entries || [])
    .map((e: any) => e?.video)
    .filter((v: any) => v?.id != null)
    .map((v: any) => ({ id: v.id, documentId: v.documentId }));
}

/** Add a video to the end of the list. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { user } = await getCurrentUserFromCookies();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const owned = await loadOwnedPlaylist(id, user.id);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const documentId = typeof body.videoDocumentId === 'string' ? body.videoDocumentId : '';
  if (!documentId) return NextResponse.json({ error: 'videoDocumentId required' }, { status: 400 });

  // Resolved through the guarded path, so a video the caller cannot see cannot
  // be added to a list by knowing its id.
  const video = await resolveVideoByDocumentId(documentId, user.id);
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

  const existing = currentEntries(owned);
  // Adding twice is a no-op rather than an error: the overlay shows a tick, and
  // a double click on a slow connection should not produce a duplicate entry.
  if (existing.some((e) => e.documentId === documentId)) {
    const playlist = await fetchPlaylist(id, user.id);
    return NextResponse.json({ playlist, added: false });
  }

  const res = await writePlaylist(id, { entries: toEntries([...existing.map((e) => e.id), video.id]) }, user.id);
  if (!res.ok) return NextResponse.json({ error: 'Could not add' }, { status: res.status });

  const playlist = await fetchPlaylist(id, user.id);
  return NextResponse.json({ playlist, added: true });
}

/** Remove a video from the list. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { user } = await getCurrentUserFromCookies();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const owned = await loadOwnedPlaylist(id, user.id);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const documentId = typeof body.videoDocumentId === 'string' ? body.videoDocumentId : '';
  if (!documentId) return NextResponse.json({ error: 'videoDocumentId required' }, { status: 400 });

  const remaining = currentEntries(owned)
    .filter((entry) => entry.documentId !== documentId)
    .map((entry) => entry.id);
  const res = await writePlaylist(id, { entries: toEntries(remaining) }, user.id);
  if (!res.ok) return NextResponse.json({ error: 'Could not remove' }, { status: res.status });

  const playlist = await fetchPlaylist(id, user.id);
  return NextResponse.json({ playlist });
}

/**
 * Reorder.
 *
 * Takes the full order rather than a move instruction, because the client has
 * just rendered that order and sending it whole is the only version that cannot
 * disagree with what the user sees. Ids not currently in the list are ignored
 * and missing ones are appended, so a stale client reorders what it knew about
 * instead of silently dropping the rest.
 */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { user } = await getCurrentUserFromCookies();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const owned = await loadOwnedPlaylist(id, user.id);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (!Array.isArray(body.videoDocumentIds)) {
    return NextResponse.json({ error: 'videoDocumentIds array required' }, { status: 400 });
  }

  const existing = currentEntries(owned);
  const byDocument = new Map(existing.map((e) => [e.documentId, e.id]));
  const requested = body.videoDocumentIds
    .map((docId: unknown) => (typeof docId === 'string' ? byDocument.get(docId) : undefined))
    .filter((v: number | undefined): v is number => v != null);
  const missing = existing.map((e) => e.id).filter((idValue) => !requested.includes(idValue));
  const nextOrder = [...requested, ...missing];

  const res = await writePlaylist(id, { entries: toEntries(nextOrder) }, user.id);
  if (!res.ok) return NextResponse.json({ error: 'Could not reorder' }, { status: res.status });

  const playlist = await fetchPlaylist(id, user.id);
  return NextResponse.json({ playlist });
}

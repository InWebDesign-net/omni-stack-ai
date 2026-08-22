'use client';

import { useCallback, useEffect, useState } from 'react';

export interface PlaylistVideo {
  id: number;
  documentId: string;
  slug: string;
  title: string;
  thumbnailUrl?: string;
  duration?: number;
}

export interface Playlist {
  id: number;
  documentId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  visibility: 'private' | 'unlisted' | 'subscribers' | 'public';
  videos: PlaylistVideo[];
  hiddenCount: number;
}

/**
 * One owner for "which lists does this user have, and what is in them".
 *
 * The profile tab and the add-to-playlist overlay both need that answer, and
 * they can be open at the same time — the overlay is reached from a video, the
 * tab from the profile. Two independent fetches would let one show a list the
 * other has already changed, so every mutation goes through here and every
 * consumer sees the result without a reload.
 */
export function usePlaylists(enabled = true) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/playlists', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('load failed');
      const data = await res.json();
      setPlaylists(data.playlists || []);
    } catch {
      setError('Playlists konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  /** Replaces one list in place, so the other consumer does not have to refetch. */
  const replace = useCallback((next: Playlist) => {
    setPlaylists((prev) => prev.map((p) => (p.documentId === next.documentId ? next : p)));
  }, []);

  const create = useCallback(async (title: string) => {
    const res = await fetch('/api/playlists', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) return null;
    const { playlist } = await res.json();
    setPlaylists((prev) => [playlist, ...prev]);
    return playlist as Playlist;
  }, []);

  const update = useCallback(
    async (documentId: string, patch: Partial<Pick<Playlist, 'title' | 'description' | 'thumbnailUrl' | 'visibility'>>) => {
      const res = await fetch(`/api/playlists/${documentId}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) return false;
      const { playlist } = await res.json();
      replace(playlist);
      return true;
    },
    [replace]
  );

  const remove = useCallback(async (documentId: string) => {
    const res = await fetch(`/api/playlists/${documentId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    if (!res.ok) return false;
    setPlaylists((prev) => prev.filter((p) => p.documentId !== documentId));
    return true;
  }, []);

  const addVideo = useCallback(
    async (documentId: string, videoDocumentId: string) => {
      const res = await fetch(`/api/playlists/${documentId}/items`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoDocumentId }),
      });
      if (!res.ok) return false;
      const { playlist } = await res.json();
      replace(playlist);
      return true;
    },
    [replace]
  );

  const removeVideo = useCallback(
    async (documentId: string, videoDocumentId: string) => {
      const res = await fetch(`/api/playlists/${documentId}/items`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoDocumentId }),
      });
      if (!res.ok) return false;
      const { playlist } = await res.json();
      replace(playlist);
      return true;
    },
    [replace]
  );

  /**
   * Sends the whole order rather than a move.
   *
   * The client has just rendered this order, so sending it whole is the only
   * version that cannot disagree with what the user is looking at.
   */
  const reorder = useCallback(
    async (documentId: string, videoDocumentIds: string[]) => {
      const res = await fetch(`/api/playlists/${documentId}/items`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoDocumentIds }),
      });
      if (!res.ok) return false;
      const { playlist } = await res.json();
      replace(playlist);
      return true;
    },
    [replace]
  );

  /**
   * Which of the user's lists already contain this video.
   *
   * Matched on `documentId`, not the numeric id. Videos are bilingual, so one
   * video is two rows with two numeric ids; the page renders whichever the
   * current language picked, while the playlist holds whichever was added.
   * Comparing those made a video look absent from a list it was already in —
   * and the click that followed did nothing, because adding it again is a
   * no-op. `documentId` is the same for both rows.
   */
  const listsContaining = useCallback(
    (videoDocumentId: string) =>
      playlists
        .filter((p) => p.videos.some((v) => v.documentId === videoDocumentId))
        .map((p) => p.documentId),
    [playlists]
  );

  return { playlists, isLoading, error, reload: load, create, update, remove, addVideo, removeVideo, reorder, listsContaining };
}

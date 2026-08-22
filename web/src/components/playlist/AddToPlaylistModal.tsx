'use client';

import React, { useState } from 'react';
import { ListPlus, Check, Plus, X, Lock, Globe, Link2, Users } from 'lucide-react';
import { usePlaylists, type Playlist } from '@/lib/hooks/usePlaylists';
import { useApp } from '@/context/AppContext';

interface AddToPlaylistModalProps {
  /** The video's `documentId` — stable across the German and English rows. */
  videoDocumentId: string;
  isOpen: boolean;
  onClose: () => void;
}

const VISIBILITY_ICON: Record<Playlist['visibility'], React.ComponentType<{ className?: string }>> = {
  private: Lock,
  unlisted: Link2,
  subscribers: Users,
  public: Globe,
};

function Shell({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-sm bg-surface-raised border border-subtle rounded-2xl shadow-2xl p-5 animate-scaleIn"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-primary">
            <ListPlus className="w-4 h-4 text-indigo-400" />
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-primary transition-colors cursor-pointer"
            aria-label="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Add the video to one of the user's lists, or to a new one.
 *
 * The path most people will actually use — the profile tab is for tidying up
 * afterwards — so it has to work without leaving the page, and it has to show
 * which lists the video is already in rather than making the user remember.
 */
export function AddToPlaylistModal({ videoDocumentId, isOpen, onClose }: AddToPlaylistModalProps) {
  const { currentUser, openAuthModal, t } = useApp();
  const { playlists, isLoading, create, addVideo, removeVideo, listsContaining } = usePlaylists(
    isOpen && Boolean(currentUser)
  );
  const [newTitle, setNewTitle] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  if (!isOpen) return null;

  if (!currentUser) {
    return (
      <Shell onClose={onClose} title={t?.playlists?.title || 'Zu Playlist hinzufügen'}>
        <p className="text-sm text-muted">
          {t?.playlists?.signInHint || 'Playlists gehören zu deinem Konto — melde dich an, um eine anzulegen.'}
        </p>
        <button
          type="button"
          onClick={() => { onClose(); openAuthModal(); }}
          className="mt-4 w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          {t?.nav?.login || 'Anmelden'}
        </button>
      </Shell>
    );
  }

  const containing = listsContaining(videoDocumentId);

  const toggle = async (playlist: Playlist) => {
    setBusyId(playlist.documentId);
    setFailed(null);
    const isIn = containing.includes(playlist.documentId);
    const ok = isIn
      ? await removeVideo(playlist.documentId, videoDocumentId)
      : await addVideo(playlist.documentId, videoDocumentId);
    // A failed write that leaves the tick behind is worse than a slow one, so
    // the state only changes when the server agrees — and says so when it does not.
    if (!ok) setFailed(playlist.documentId);
    setBusyId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setBusyId('new');
    setFailed(null);
    const created = await create(title);
    if (created) {
      await addVideo(created.documentId, videoDocumentId);
      setNewTitle('');
    } else {
      setFailed('new');
    }
    setBusyId(null);
  };

  return (
    <Shell onClose={onClose} title={t?.playlists?.title || 'Zu Playlist hinzufügen'}>
      {isLoading && playlists.length === 0 ? (
        <p className="text-sm text-muted py-4">{t?.common?.loading || 'Wird geladen…'}</p>
      ) : (
        <ul className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
          {playlists.map((playlist) => {
            const isIn = containing.includes(playlist.documentId);
            const VisIcon = VISIBILITY_ICON[playlist.visibility] || Lock;
            return (
              <li key={playlist.documentId}>
                <button
                  type="button"
                  onClick={() => toggle(playlist)}
                  disabled={busyId === playlist.documentId}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface hover:bg-surface-raised border border-subtle transition-colors text-left cursor-pointer disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${isIn ? 'bg-indigo-600 border-indigo-500' : 'border-subtle'}`}>
                    {isIn && <Check className="w-3.5 h-3.5 text-white" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-primary truncate">{playlist.title}</span>
                    <span className="block text-[11px] text-muted">
                      {playlist.videos.length}{' '}
                      {playlist.videos.length === 1
                        ? t?.playlists?.video || 'Video'
                        : t?.playlists?.videos || 'Videos'}
                    </span>
                  </span>
                  <VisIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                </button>
                {failed === playlist.documentId && (
                  <p className="text-[11px] text-rose-400 px-3 pt-1">
                    {t?.playlists?.writeFailed || 'Änderung konnte nicht gespeichert werden.'}
                  </p>
                )}
              </li>
            );
          })}
          {playlists.length === 0 && (
            <li className="text-sm text-muted py-2">
              {t?.playlists?.empty || 'Du hast noch keine Playlists.'}
            </li>
          )}
        </ul>
      )}

      <form onSubmit={handleCreate} className="mt-4 pt-4 border-t border-subtle flex items-center gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder={t?.playlists?.newPlaceholder || 'Neue Playlist…'}
          maxLength={120}
          className="flex-1 bg-surface border border-subtle rounded-xl px-3 py-2 text-sm text-primary placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!newTitle.trim() || busyId === 'new'}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-surface-raised disabled:text-faint text-white transition-colors cursor-pointer shrink-0"
          title={t?.playlists?.create || 'Anlegen'}
          aria-label={t?.playlists?.create || 'Anlegen'}
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>
      {failed === 'new' && (
        <p className="text-[11px] text-rose-400 pt-1">
          {t?.playlists?.createFailed || 'Playlist konnte nicht angelegt werden.'}
        </p>
      )}
      <p className="mt-2 text-[11px] text-muted">
        {t?.playlists?.privateHint || 'Neue Playlists sind privat, bis du sie im Profil freigibst.'}
      </p>
    </Shell>
  );
}

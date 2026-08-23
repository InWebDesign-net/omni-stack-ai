'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Trash2, ChevronUp, ChevronDown, Lock, Globe, Link2, Users, ListVideo, Plus, EyeOff,
} from 'lucide-react';
import { usePlaylists, type Playlist, type PlaylistVideo } from '@/lib/hooks/usePlaylists';

const VISIBILITY: { key: Playlist['visibility']; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { key: 'private', icon: Lock, label: 'Privat' },
  { key: 'unlisted', icon: Link2, label: 'Über Link' },
  { key: 'subscribers', icon: Users, label: 'Abonnenten' },
  { key: 'public', icon: Globe, label: 'Öffentlich' },
];

function SortableRow({ video, index, count, listId, onMove, onRemove, t }: {
  video: PlaylistVideo; index: number; count: number; listId: string;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (videoDocumentId: string) => void;
  t?: any;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.documentId });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className="flex items-center gap-2 bg-surface border border-subtle rounded-xl p-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1.5 text-muted hover:text-primary cursor-grab active:cursor-grabbing rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        aria-label={t?.playlists?.dragHandle || 'Zum Sortieren ziehen'}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {video.thumbnailUrl ? (
        <Image src={video.thumbnailUrl} alt="" width={64} height={36} className="w-16 h-9 rounded-md object-cover shrink-0" />
      ) : (
        <div className="w-16 h-9 rounded-md bg-surface-raised shrink-0" />
      )}

      {/* Opens the video inside this list, so the panel and the vertical view
          both know which one they are in. */}
      <Link
        href={`/video/${video.slug}?list=${encodeURIComponent(listId)}`}
        className="flex-1 min-w-0 text-sm text-primary hover:text-indigo-400 transition-colors truncate"
      >
        {video.title}
      </Link>

      {/* Keyboard-reachable equivalents of the drag handle. */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0}
          className="p-1.5 rounded-lg text-muted hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          aria-label={t?.playlists?.moveUp || 'Nach oben'}>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => onMove(index, 1)} disabled={index === count - 1}
          className="p-1.5 rounded-lg text-muted hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          aria-label={t?.playlists?.moveDown || 'Nach unten'}>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => onRemove(video.documentId)}
          className="p-1.5 rounded-lg text-muted hover:text-rose-400 cursor-pointer"
          aria-label={t?.playlists?.removeItem || 'Aus Playlist entfernen'}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </li>
  );
}

/**
 * The mutations come from the parent's hook instance rather than a second call
 * to `usePlaylists` here. The hook owns state per instance, so a card calling
 * it again would update its own copy and leave the list it is rendered in
 * unchanged — the write would succeed and the screen would not move.
 */
interface PlaylistCardProps {
  playlist: Playlist;
  isOwner: boolean;
  actions: Pick<ReturnType<typeof usePlaylists>, 'update' | 'remove' | 'removeVideo' | 'reorder'>;
  t?: any;
}

function PlaylistCard({ playlist, isOwner, actions, t }: PlaylistCardProps) {
  const { update, remove, removeVideo, reorder } = actions;
  const [videos, setVideos] = useState(playlist.videos);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(playlist.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  React.useEffect(() => setVideos(playlist.videos), [playlist.videos]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const persistOrder = (next: PlaylistVideo[]) => {
    setVideos(next);
    reorder(playlist.documentId, next.map((v) => v.documentId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = videos.findIndex((v) => v.documentId === active.id);
    const to = videos.findIndex((v) => v.documentId === over.id);
    if (from === -1 || to === -1) return;
    persistOrder(arrayMove(videos, from, to));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= videos.length) return;
    persistOrder(arrayMove(videos, index, target));
  };

  const CurrentIcon = VISIBILITY.find((v) => v.key === playlist.visibility)?.icon || Lock;

  return (
    <div className="bg-surface-raised border border-subtle rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-24 h-14 rounded-lg overflow-hidden bg-surface shrink-0">
          {(playlist.thumbnailUrl || videos[0]?.thumbnailUrl) ? (
            <Image src={playlist.thumbnailUrl || videos[0].thumbnailUrl!} alt="" width={96} height={56} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-faint"><ListVideo className="w-5 h-5" /></div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <form
              onSubmit={(e) => { e.preventDefault(); update(playlist.documentId, { title }); setIsEditing(false); }}
              className="flex items-center gap-2"
            >
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} autoFocus
                className="flex-1 bg-surface border border-subtle rounded-lg px-2 py-1 text-sm text-primary outline-none focus:border-indigo-500" />
              <button type="submit" className="text-xs font-semibold text-indigo-400 cursor-pointer">{t?.common?.save || 'Speichern'}</button>
            </form>
          ) : (
            <button type="button" onClick={() => isOwner && setIsEditing(true)}
              className={`text-sm font-bold text-primary text-left truncate w-full ${isOwner ? 'cursor-pointer hover:text-indigo-400' : ''}`}>
              {playlist.title}
            </button>
          )}
          <p className="text-[11px] text-muted mt-0.5">
            {videos.length} {videos.length === 1 ? (t?.playlists?.video || 'Video') : (t?.playlists?.videos || 'Videos')}
            {playlist.hiddenCount > 0 && (
              <span className="inline-flex items-center gap-1 ml-2 text-amber-400/90">
                <EyeOff className="w-3 h-3" />
                {playlist.hiddenCount} {t?.playlists?.hidden || 'nicht sichtbar'}
              </span>
            )}
          </p>
        </div>

        {isOwner && (
          <div className="flex items-center gap-1 shrink-0">
            <select
              value={playlist.visibility}
              onChange={(e) => update(playlist.documentId, { visibility: e.target.value as Playlist['visibility'] })}
              className="bg-surface border border-subtle rounded-lg px-2 py-1 text-[11px] text-primary cursor-pointer outline-none focus:border-indigo-500"
              aria-label={t?.playlists?.visibility || 'Sichtbarkeit'}
            >
              {VISIBILITY.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
            </select>
            <CurrentIcon className="w-3.5 h-3.5 text-muted" />
            <button type="button" onClick={() => (confirmDelete ? remove(playlist.documentId) : setConfirmDelete(true))}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${confirmDelete ? 'text-rose-400 bg-rose-500/10' : 'text-muted hover:text-rose-400'}`}
              aria-label={confirmDelete ? (t?.playlists?.confirmDelete || 'Wirklich löschen') : (t?.playlists?.delete || 'Playlist löschen')}
              title={confirmDelete ? (t?.playlists?.confirmDelete || 'Wirklich löschen?') : (t?.playlists?.delete || 'Playlist löschen')}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {videos.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={videos.map((v) => v.documentId)} strategy={verticalListSortingStrategy}>
            <ul className="mt-3 space-y-1.5">
              {videos.map((video, index) => (
                <SortableRow
                  key={video.documentId}
                  video={video}
                  index={index}
                  count={videos.length}
                  listId={playlist.documentId}
                  onMove={move}
                  onRemove={(videoDocumentId) => {
                    setVideos((prev) => prev.filter((v) => v.documentId !== videoDocumentId));
                    removeVideo(playlist.documentId, videoDocumentId);
                  }}
                  t={t}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

/**
 * The profile's playlist tab: create, rename, publish, reorder, delete.
 *
 * Visitors see only what the visibility rules allow — the same filtering that
 * hides private lists also drops items a viewer may not see, which is why a
 * card can report fewer videos than its owner put in it.
 */
export function UserPlaylistsTab({ isOwner, t }: { isOwner: boolean; t?: any }) {
  const { playlists, isLoading, create, update, remove, removeVideo, reorder } = usePlaylists(true);
  const [newTitle, setNewTitle] = useState('');

  return (
    <div className="space-y-3">
      {isOwner && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (newTitle.trim()) { create(newTitle.trim()); setNewTitle(''); } }}
          className="flex items-center gap-2"
        >
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t?.playlists?.newPlaceholder || 'Neue Playlist…'}
            maxLength={120}
            className="flex-1 bg-surface border border-subtle rounded-xl px-3 py-2 text-sm text-primary placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
          />
          <button type="submit" disabled={!newTitle.trim()}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-surface-raised disabled:text-faint text-white transition-colors cursor-pointer"
            aria-label={t?.playlists?.create || 'Anlegen'}>
            <Plus className="w-4 h-4" />
          </button>
        </form>
      )}

      {isLoading && playlists.length === 0 && (
        <p className="text-sm text-muted py-6 text-center">{t?.common?.loading || 'Wird geladen…'}</p>
      )}

      {!isLoading && playlists.length === 0 && (
        <div className="text-center py-10">
          <ListVideo className="w-8 h-8 mx-auto text-faint mb-2" />
          <p className="text-sm text-muted">
            {isOwner
              ? t?.playlists?.empty || 'Du hast noch keine Playlists.'
              : t?.playlists?.emptyGuest || 'Dieser Nutzer hat noch keine öffentlichen Playlists.'}
          </p>
        </div>
      )}

      {playlists.map((playlist) => (
        <PlaylistCard
          key={playlist.documentId}
          playlist={playlist}
          isOwner={isOwner}
          actions={{ update, remove, removeVideo, reorder }}
          t={t}
        />
      ))}
    </div>
  );
}

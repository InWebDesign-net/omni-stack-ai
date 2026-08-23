'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ListVideo, Lock, Globe, Link2, Users, EyeOff, Play } from 'lucide-react';

interface PlaylistPanelVideo {
  id: number;
  documentId: string;
  slug: string;
  title: string;
  thumbnailUrl?: string;
  duration?: number;
}

interface PlaylistPanelProps {
  /** The playlist's `documentId`, taken from the `list` URL parameter. */
  listId: string;
  /** Slug of the video currently playing, so the panel can mark it. */
  currentSlug: string;
  t?: any;
}

const VISIBILITY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  private: Lock,
  unlisted: Link2,
  subscribers: Users,
  public: Globe,
};

function formatDuration(seconds?: number): string {
  if (!seconds || seconds < 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * The playlist you are watching inside, beside the player.
 *
 * Every link keeps `?list=`, so moving through the list stays inside it —
 * losing the parameter on the first click would make the panel a one-way door
 * and break the jump into the vertical view, which reads the same parameter.
 */
export function PlaylistPanel({ listId, currentSlug, t }: PlaylistPanelProps) {
  const [playlist, setPlaylist] = useState<{
    title: string;
    visibility: string;
    videos: PlaylistPanelVideo[];
    hiddenCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetch(`/api/playlists/${listId}`, { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active) setPlaylist(data?.playlist || null);
      })
      .catch(() => {})
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [listId]);

  // A list that cannot be read is not an error worth showing here: the video
  // plays regardless, and an empty panel would only take space from it.
  if (!isLoading && !playlist) return null;

  const VisIcon = VISIBILITY_ICON[playlist?.visibility || 'private'] || Lock;
  const currentIndex = playlist?.videos.findIndex((v) => v.slug === currentSlug) ?? -1;

  return (
    <aside className="bg-surface border border-subtle rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-subtle">
        <div className="flex items-center gap-2">
          <ListVideo className="w-4 h-4 text-indigo-400 shrink-0" />
          <h2 className="text-sm font-bold text-primary truncate flex-1">
            {playlist?.title || (t?.common?.loading || 'Wird geladen…')}
          </h2>
          <VisIcon className="w-3.5 h-3.5 text-muted shrink-0" />
        </div>
        {playlist && (
          <p className="text-[11px] text-muted mt-0.5">
            {currentIndex >= 0 ? `${currentIndex + 1} / ${playlist.videos.length}` : `${playlist.videos.length}`}
            {playlist.hiddenCount > 0 && (
              <span className="inline-flex items-center gap-1 ml-2 text-amber-400/90">
                <EyeOff className="w-3 h-3" />
                {playlist.hiddenCount} {t?.playlists?.hidden || 'nicht sichtbar'}
              </span>
            )}
          </p>
        )}
      </div>

      <ul className="max-h-[60vh] overflow-y-auto divide-y divide-subtle/50">
        {(playlist?.videos || []).map((video, index) => {
          const isCurrent = video.slug === currentSlug;
          return (
            <li key={video.documentId}>
              <Link
                href={`/video/${video.slug}?list=${encodeURIComponent(listId)}`}
                className={`flex items-center gap-2.5 px-3 py-2.5 transition-colors ${
                  isCurrent ? 'bg-indigo-500/10' : 'hover:bg-surface-raised'
                }`}
                aria-current={isCurrent ? 'true' : undefined}
              >
                <span className={`w-5 text-[11px] font-mono shrink-0 text-center ${isCurrent ? 'text-indigo-400' : 'text-faint'}`}>
                  {isCurrent ? <Play className="w-3 h-3 mx-auto fill-current" /> : index + 1}
                </span>
                {video.thumbnailUrl ? (
                  <Image src={video.thumbnailUrl} alt="" width={80} height={45} className="w-20 h-11 rounded-md object-cover shrink-0" />
                ) : (
                  <div className="w-20 h-11 rounded-md bg-surface-raised shrink-0" />
                )}
                <span className="flex-1 min-w-0">
                  <span className={`block text-xs font-medium line-clamp-2 ${isCurrent ? 'text-indigo-300' : 'text-primary'}`}>
                    {video.title}
                  </span>
                  {video.duration ? (
                    <span className="block text-[10px] text-muted mt-0.5 font-mono">{formatDuration(video.duration)}</span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

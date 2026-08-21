'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Search, X, Loader2, ImageIcon, Video as VideoIcon } from 'lucide-react';

/**
 * Picks an existing image or video for a media block.
 *
 * `shared.image` and `shared.video` hold a relation, not a file, so the block's
 * job is to choose something that already exists. Only the author's own items are
 * offered — the endpoint derives the creator from the session, so this cannot be
 * pointed at anyone else's library.
 *
 * Private items are included on purpose: they are the author's own, and the ones
 * they most likely want to place before publishing.
 */

export interface MediaRelation {
  id?: number;
  documentId?: string;
  title?: string;
  slug?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  visibility?: string;
}

interface MediaBlockPickerProps {
  kind: 'image' | 'video';
  value: MediaRelation | string | null | undefined;
  onChange: (relation: MediaRelation | null) => void;
  t?: any;
}

const thumbOf = (item: MediaRelation): string | null =>
  item.thumbnailUrl || item.imageUrl || null;

export function MediaBlockPicker({ kind, value, onChange, t }: MediaBlockPickerProps) {
  const b = t?.blocks || {};
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaRelation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A relation that came back from Strapi is a populated object; one that was
  // only ever a documentId string carries no title to show.
  const selected: MediaRelation | null = useMemo(() => {
    if (!value) return null;
    if (typeof value === 'string') return { documentId: value };
    return value;
  }, [value]);

  const hasSelection = Boolean(selected);

  useEffect(() => {
    if (hasSelection) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ pageSize: '12' });
        if (query.trim()) params.set('q', query.trim());
        const res = await fetch(`/api/content/${kind}/mine?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(String(res.status));
        const body = await res.json();
        if (!cancelled) setResults(Array.isArray(body?.data) ? body.data : []);
      } catch {
        if (!cancelled) setError(b.mediaLoadFailed || 'Inhalte konnten nicht geladen werden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
      // Debounced: the author types into this, and one request per keystroke
      // would both hammer Strapi and race its own results back out of order.
    }, query ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [kind, query, hasSelection, b.mediaLoadFailed]);

  const Icon = kind === 'image' ? ImageIcon : VideoIcon;

  if (selected) {
    const thumb = thumbOf(selected);
    return (
      <div className="flex items-center gap-3 p-2 rounded-xl bg-base border border-subtle">
        <div className="relative w-20 h-12 shrink-0 rounded-lg overflow-hidden bg-surface">
          {thumb ? (
            <Image src={thumb} alt="" fill sizes="80px" className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon className="w-4 h-4 text-faint" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-primary truncate">
            {selected.title || selected.slug || selected.documentId}
          </p>
          {selected.visibility && selected.visibility !== 'public' && (
            <p className="text-[10px] font-mono text-faint uppercase">{selected.visibility}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={b.mediaClear || 'Verknüpfung entfernen'}
          title={b.mediaClear || 'Verknüpfung entfernen'}
          className="p-1.5 rounded-lg text-faint hover:text-rose-400 hover:bg-surface-raised transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-faint" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            kind === 'image'
              ? b.mediaSearchImages || 'Eigene Bilder durchsuchen…'
              : b.mediaSearchVideos || 'Eigene Videos durchsuchen…'
          }
          aria-label={
            kind === 'image'
              ? b.mediaSearchImages || 'Eigene Bilder durchsuchen'
              : b.mediaSearchVideos || 'Eigene Videos durchsuchen'
          }
          className="w-full pl-9 pr-3 py-2 bg-base border border-subtle rounded-xl text-sm text-primary placeholder-faint outline-none focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {error && <p className="text-[11px] text-rose-400">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-muted">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{b.mediaLoading || 'Lade…'}</span>
        </div>
      ) : results.length === 0 ? (
        <p className="text-[11px] text-faint italic py-2">
          {query.trim()
            ? (b.mediaNoMatch || 'Nichts gefunden für „{query}".').replace('{query}', query.trim())
            : b.mediaNoneYet || 'Du hast noch keine Inhalte dieser Art.'}
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
          {results.map((item) => {
            const thumb = thumbOf(item);
            return (
              <button
                key={item.documentId || item.id}
                type="button"
                onClick={() => onChange(item)}
                title={item.title}
                className="group text-left rounded-lg overflow-hidden border border-subtle hover:border-purple-500/60 bg-base transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <div className="relative aspect-video bg-surface">
                  {thumb ? (
                    <Image src={thumb} alt="" fill sizes="120px" className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon className="w-4 h-4 text-faint" />
                    </div>
                  )}
                </div>
                <p className="px-1.5 py-1 text-[10px] text-muted group-hover:text-primary truncate transition-colors">
                  {item.title || item.slug}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

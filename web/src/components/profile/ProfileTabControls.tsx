'use client';

import React, { useEffect, useRef } from 'react';
import { Search, X, Loader2, ArrowDownWideNarrow } from 'lucide-react';
import { PROFILE_SORTS, type ProfileSort } from '@/lib/hooks/useProfileTabList';

interface ToolbarProps {
  sort: ProfileSort;
  onSortChange: (next: ProfileSort) => void;
  searchInput: string;
  onSearchInput: (value: string) => void;
  onClearSearch: () => void;
  total: number;
  lang: 'de' | 'en';
  placeholder?: string;
}

/** Sort and search for one profile tab. Both go to the server. */
export function ProfileTabToolbar({
  sort,
  onSortChange,
  searchInput,
  onSearchInput,
  onClearSearch,
  total,
  lang,
  placeholder,
}: ToolbarProps) {
  const de = lang === 'de';
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-0">
        <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => onSearchInput(e.target.value)}
          placeholder={placeholder || (de ? 'Nach Titel suchen…' : 'Search by title…')}
          aria-label={de ? 'In diesem Tab suchen' : 'Search this tab'}
          className="w-full bg-surface border border-subtle rounded-xl pl-9 pr-9 py-2 text-xs text-primary placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
        />
        {searchInput && (
          <button
            type="button"
            onClick={onClearSearch}
            aria-label={de ? 'Suche zurücksetzen' : 'Clear search'}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <ArrowDownWideNarrow className="w-4 h-4 text-muted" aria-hidden="true" />
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as ProfileSort)}
          aria-label={de ? 'Sortierung' : 'Sort order'}
          className="bg-surface border border-subtle rounded-xl px-3 py-2 text-xs font-semibold text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
        >
          {PROFILE_SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {de ? s.labelDe : s.labelEn}
            </option>
          ))}
        </select>
        <span className="text-[11px] font-mono text-muted whitespace-nowrap">
          {total} {de ? 'Einträge' : 'items'}
        </span>
      </div>
    </div>
  );
}

interface FooterProps {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  lang: 'de' | 'en';
}

/**
 * Loads the next page when scrolled into view, and stays a real button so the
 * list is reachable without scroll gymnastics — a sentinel alone is unusable
 * with a keyboard.
 */
export function ProfileTabLoadMore({ hasMore, isLoadingMore, onLoadMore, lang }: FooterProps) {
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { rootMargin: '320px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div ref={sentinel} className="flex justify-center py-6">
      <button
        type="button"
        onClick={onLoadMore}
        disabled={isLoadingMore}
        className="px-4 py-2 rounded-xl bg-surface border border-subtle text-xs font-semibold text-primary hover:bg-surface-raised disabled:opacity-60 transition-colors cursor-pointer inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {isLoadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        <span>{lang === 'de' ? 'Mehr laden' : 'Load more'}</span>
      </button>
    </div>
  );
}

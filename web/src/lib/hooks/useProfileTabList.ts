'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ContentKind } from '@omni/shared';

export type ProfileSort = 'newest' | 'mostpopular' | 'trending' | 'titleasc';

export const PROFILE_SORTS: { key: ProfileSort; labelDe: string; labelEn: string }[] = [
  { key: 'newest', labelDe: 'Neueste', labelEn: 'Newest' },
  { key: 'mostpopular', labelDe: 'Meistgesehen', labelEn: 'Most viewed' },
  { key: 'trending', labelDe: 'Beliebt', labelEn: 'Popular' },
  { key: 'titleasc', labelDe: 'Titel A–Z', labelEn: 'Title A–Z' },
];

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;

interface Options {
  kind: ContentKind;
  creatorId: number | string | null | undefined;
  /** Only the visible tab fetches. */
  active: boolean;
  lang: 'de' | 'en';
  /** Count from the server render, so the tab label is right before anything loads. */
  initialTotal?: number;
}

/**
 * One profile tab's list: paginated, sorted and searched on the server.
 *
 * The profile used to load every tab's content up front with a fixed
 * `pageSize=200`, which truncated silently and downloaded three tabs nobody had
 * opened. `/api/content/{kind}/list` already forwards `page`, `pageSize`,
 * `sort`, `q` and `filters` to the filtered services, so this is mostly a
 * matter of asking it.
 *
 * Searching and sorting go to the server on purpose. Doing either over the
 * loaded array works right up until someone has more than one page, and then
 * quietly returns wrong answers instead of failing.
 */
export function useProfileTabList({ kind, creatorId, active, lang, initialTotal }: Options) {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState<number>(initialTotal ?? 0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sort, setSortState] = useState<ProfileSort>('newest');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Every fetch carries the generation it belongs to. A slow first page must
  // not overwrite the results of a search the reader has since typed.
  const generation = useRef(0);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const buildUrl = useCallback(
    (targetPage: number) => {
      const params = new URLSearchParams();
      if (creatorId != null && creatorId !== '') {
        params.set('filters[creator][id][$eq]', String(creatorId));
      }
      params.set('page', String(targetPage));
      params.set('pageSize', String(PAGE_SIZE));
      params.set('sort', sort);
      params.set('lang', lang);
      if (search) params.set('q', search);
      return `/api/content/${kind}/list?${params.toString()}`;
    },
    [kind, creatorId, sort, lang, search]
  );

  const fetchPage = useCallback(
    async (targetPage: number, append: boolean) => {
      const mine = ++generation.current;
      append ? setIsLoadingMore(true) : setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(buildUrl(targetPage), { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (mine !== generation.current) return;

        const batch: any[] = Array.isArray(json?.data) ? json.data : [];
        const pagination = json?.meta?.pagination ?? {};
        setTotal(typeof pagination.total === 'number' ? pagination.total : batch.length);
        setPageCount(typeof pagination.pageCount === 'number' ? pagination.pageCount : 1);
        setPage(targetPage);
        setItems((prev) => {
          if (!append) return batch;
          // Appending can overlap when something is inserted between requests.
          const seen = new Set(prev.map((i) => i.documentId || i.id || i.slug));
          return [...prev, ...batch.filter((i) => !seen.has(i.documentId || i.id || i.slug))];
        });
      } catch (e: any) {
        if (mine !== generation.current) return;
        setError(e?.message || 'Laden fehlgeschlagen');
        if (!append) setItems([]);
      } finally {
        if (mine === generation.current) {
          append ? setIsLoadingMore(false) : setIsLoading(false);
        }
      }
    },
    [buildUrl]
  );

  // First page whenever the tab becomes visible, or the sort or search changes.
  useEffect(() => {
    if (!active) return;
    hasLoadedOnce.current = true;
    fetchPage(1, false);
  }, [active, fetchPage]);

  const hasMore = page < pageCount;

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || isLoadingMore) return;
    fetchPage(page + 1, true);
  }, [hasMore, isLoading, isLoadingMore, page, fetchPage]);

  const setSort = useCallback((next: ProfileSort) => {
    // Back to the first page: appending page 2 of a different ordering produces
    // a list that is wrong in a way nobody can see.
    setSortState(next);
  }, []);

  return {
    items,
    total,
    isLoading: isLoading && !hasLoadedOnce.current ? true : isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
    sort,
    setSort,
    searchInput,
    setSearchInput,
    isSearching: search.length > 0,
    clearSearch: () => setSearchInput(''),
  };
}

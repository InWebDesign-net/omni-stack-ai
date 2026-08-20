'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { ContentKind } from '@omni/shared';
import { useApp } from '@/context/AppContext';
import { useTagFilter } from '@/lib/hooks/useTagFilter';
import { useContentList, useContentTags } from '@/lib/hooks/useContentList';

/**
 * Everything a content list page needs except its cards.
 *
 * `/videos`, `/articles` and `/images` each carried their own copy of this:
 * the same four URL parameters, the same updateURL, the same search / sort /
 * pagination handlers, the same reset logic. Only the cards genuinely differ,
 * so the state lives here once and the pages render the difference.
 *
 * The URL is the single source of truth — `q`, `page`, `sort` and `fav` are read
 * from it rather than mirrored into component state, so a shared link restores
 * the exact view.
 */

const DEFAULT_SORT = 'createdatasc';

export interface UseContentListPageOptions {
  perPage?: number;
}

export function useContentListPage<T>(kind: ContentKind, options: UseContentListPageOptions = {}) {
  const { perPage = 24 } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lang } = useApp();

  // Single source of truth: the URL.
  const searchTerm = searchParams.get('q') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sort = searchParams.get('sort') || DEFAULT_SORT;
  const filterFavorites = searchParams.get('favsOnly') || searchParams.get('fav') || 'false';

  const [searchInput, setSearchInput] = useState(searchTerm);

  // Keep the uncontrolled-feeling input in step when the URL changes underneath
  // it (back button, a tag link, hardReset).
  useEffect(() => {
    setSearchInput(searchTerm);
  }, [searchTerm]);

  const updateURL = useCallback(
    (newParams: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      });
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const { tags: allTags, isLoading: isLoadingTags } = useContentTags(kind, lang);

  const tagFilter = useTagFilter(allTags, updateURL);
  const { includedTags, excludedTags, matchMode } = tagFilter;

  const { items, total, isLoading, isError, refresh } = useContentList<T>(kind, {
    currentPage,
    pageSize: perPage,
    sort,
    searchTerm,
    filterFavorites,
    includedTags,
    excludedTags,
    matchMode,
    lang,
    enabled: true,
  });

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const handleSortChange = useCallback(
    (value: string) => updateURL({ sort: value, page: '1' }),
    [updateURL]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      updateURL({ page: page.toString() });
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [updateURL]
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      updateURL({ q: searchInput.trim() || null, page: '1' });
    },
    [searchInput, updateURL]
  );

  const clearSearch = useCallback(() => {
    setSearchInput('');
    updateURL({ q: null, page: '1' });
  }, [updateURL]);

  const hardReset = useCallback(() => {
    setSearchInput('');
    router.push(pathname);
  }, [pathname, router]);

  // Only correct an out-of-range page once loading has settled, otherwise the
  // empty first render would bounce every deep link back to page 1.
  useEffect(() => {
    if (!isLoading && total > 0 && currentPage > totalPages) {
      updateURL({ page: '1' });
    }
  }, [isLoading, total, currentPage, totalPages, updateURL]);

  const hasActiveFilters = Boolean(
    searchTerm ||
      sort !== DEFAULT_SORT ||
      filterFavorites === 'true' ||
      includedTags.length > 0 ||
      excludedTags.length > 0
  );

  return {
    // URL-derived state
    searchTerm,
    currentPage,
    sort,
    filterFavorites,
    lang,
    perPage,
    // search box
    searchInput,
    setSearchInput,
    handleSearchSubmit,
    clearSearch,
    // tag filtering
    ...tagFilter,
    allTags,
    isLoadingTags,
    // data
    items,
    total,
    isLoading,
    isError,
    refresh,
    totalPages,
    // navigation
    updateURL,
    handleSortChange,
    handlePageChange,
    hardReset,
    hasActiveFilters,
  };
}

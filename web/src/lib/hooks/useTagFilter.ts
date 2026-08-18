import React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { TagCount } from '@/lib/videoFilters';

export type UpdateURLFn = (newParams: Record<string, string | null>) => void;

export interface TagFilterState {
  includedTags: string[];
  excludedTags: string[];
  matchMode: 'any' | 'all';
  tagSearch: string;
  isTagCloudExpanded: boolean;
  allTags: TagCount[];
  filteredAllTags: TagCount[];
  hasTagFilters: boolean;
  toggleTag: (tag: string) => void;
  setMatchMode: (mode: 'any' | 'all') => void;
  setTagSearch: (query: string) => void;
  setIsTagCloudExpanded: (expanded: boolean) => void;
  resetTagFilters: () => void;
}

// Convert string[] to TagCount[] for internal use
function toTagCounts(items: (string | TagCount)[]): TagCount[] {
  return items.map((item) => {
    if (typeof item === 'string') return { tag: item, count: 0 };
    return item;
  });
}

export function useTagFilter(
  allTags: (string | TagCount)[] = [],
  updateURL?: UpdateURLFn
): TagFilterState {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Internal fallback URL updater if custom updateURL function is not provided
  const handleUpdateURL: UpdateURLFn = React.useCallback(
    (newParams) => {
      if (updateURL) {
        updateURL(newParams);
      } else {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(newParams).forEach(([key, value]) => {
          if (value === null || value === '' || value === 'false') {
            params.delete(key);
          } else {
            params.set(key, value);
          }
        });
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      }
    },
    [updateURL, searchParams, router, pathname]
  );

  // URL-synced state
  const includedTags = (searchParams.get('includetag') || '')
    .split(',')
    .filter(Boolean);
  const excludedTags = (searchParams.get('excludetag') || '')
    .split(',')
    .filter(Boolean);
  const matchMode = searchParams.get('matchmode') === 'all' ? 'all' : 'any';

  // Local state
  const [tagSearch, setTagSearch] = React.useState('');
  const [isTagCloudExpanded, setIsTagCloudExpanded] = React.useState(false);

  // Normalize tags to TagCount[]
  const normalizedTags = React.useMemo(() => toTagCounts(allTags), [allTags]);

  // Derived state
  const filteredAllTags = React.useMemo(() => {
    if (!tagSearch.trim()) return normalizedTags;
    const q = tagSearch.trim().toLowerCase();
    return normalizedTags.filter(({ tag }) => tag.toLowerCase().includes(q));
  }, [normalizedTags, tagSearch]);

  const hasTagFilters = includedTags.length > 0 || excludedTags.length > 0;

  // Actions
  const toggleTag = React.useCallback(
    (tag: string) => {
      const isIncluded = includedTags.includes(tag);
      const isExcluded = excludedTags.includes(tag);
      let nextIncluded = [...includedTags];
      let nextExcluded = [...excludedTags];

      if (isIncluded) {
        nextIncluded = nextIncluded.filter((t) => t !== tag);
        nextExcluded = [...nextExcluded, tag];
      } else if (isExcluded) {
        nextExcluded = nextExcluded.filter((t) => t !== tag);
      } else {
        nextIncluded = [...nextIncluded, tag];
      }

      handleUpdateURL({
        includetag: nextIncluded.length ? nextIncluded.join(',') : null,
        excludetag: nextExcluded.length ? nextExcluded.join(',') : null,
        page: '1',
      });
    },
    [includedTags, excludedTags, handleUpdateURL]
  );

  const setMatchModeFn = React.useCallback(
    (mode: 'any' | 'all') => {
      handleUpdateURL({ matchmode: mode === 'all' ? 'all' : null, page: '1' });
    },
    [handleUpdateURL]
  );

  const resetTagFilters = React.useCallback(() => {
    handleUpdateURL({ includetag: null, excludetag: null, matchmode: null, page: '1' });
  }, [handleUpdateURL]);

  return {
    includedTags,
    excludedTags,
    matchMode,
    tagSearch,
    isTagCloudExpanded,
    allTags: normalizedTags,
    filteredAllTags,
    hasTagFilters,
    toggleTag,
    setMatchMode: setMatchModeFn,
    setTagSearch,
    setIsTagCloudExpanded,
    resetTagFilters,
  };
}

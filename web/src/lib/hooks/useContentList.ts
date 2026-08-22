import useSWR from 'swr';
import {
  ContentKind,
  type VideoItem,
  type ImageItem,
  type ArticleItem,
} from '@omni/shared';

export type { VideoItem, ImageItem, ArticleItem };

export interface UseContentListParams<T = unknown> {
  currentPage?: number;
  pageSize?: number | string;
  sort?: string;
  searchTerm?: string;
  filterFavorites?: string | boolean;
  includedTags?: string[];
  excludedTags?: string[];
  matchMode?: 'any' | 'all';
  lang?: string;
  excludeSlug?: string | string[];
  enabled?: boolean;
  fallbackData?: { items: T[]; total: number };
}

export interface UseContentListResult<T> {
  items: T[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  refresh: () => void;
}

const fetcher = async (url: string) => {
  // The list route reads the session cookie, which the browser sends on its
  // own, so the caller's identity travels without this code handling a token.
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch list');
  }
  return res.json();
};

export function useContentList<T>(kind: ContentKind, params: UseContentListParams = {}): UseContentListResult<T> {
  const {
    currentPage = 1,
    pageSize = 24,
    sort = 'createdatasc',
    searchTerm = '',
    filterFavorites = '',
    includedTags = [],
    excludedTags = [],
    matchMode = 'any',
    lang = 'de',
    excludeSlug,
    enabled = true,
    fallbackData,
  } = params || {};

  const queryParams = new URLSearchParams();
  queryParams.set('page', (currentPage || 1).toString());
  queryParams.set('pageSize', (pageSize || 24).toString());
  queryParams.set('sort', sort || 'createdatasc');
  if (lang) queryParams.set('lang', lang);

  if ((sort === 'affinity' || sort === 'personal') && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('omni_user_interest_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        const topTopics = Object.entries(parsed.topics || {})
          .sort((a: any, b: any) => b[1].score - a[1].score)
          .slice(0, 10)
          .map(([t]) => t);
        if (topTopics.length > 0) {
          queryParams.set('userTopics', topTopics.join(','));
        }
      }
    } catch (e) {
      // corrupt or absent localStorage entry — falling back to defaults
      console.error('[useContentList] could not derive topic filter from affinity profile:', e);
    }
  }

  const safeSearch = (searchTerm || '').trim();
  if (safeSearch) {
    queryParams.set('q', safeSearch);
  }
  if (filterFavorites === 'true' || filterFavorites === true) {
    queryParams.set('favsOnly', 'true');
  }
  const safeIncluded = Array.isArray(includedTags) ? includedTags : [];
  const safeExcluded = Array.isArray(excludedTags) ? excludedTags : [];
  if (safeIncluded.length > 0) {
    queryParams.set('includetag', safeIncluded.join(','));
  }
  if (safeExcluded.length > 0) {
    queryParams.set('excludetag', safeExcluded.join(','));
  }
  if (matchMode && matchMode !== 'any') {
    queryParams.set('matchmode', matchMode);
  }
  if (excludeSlug) {
    const excludes = Array.isArray(excludeSlug) ? excludeSlug.join(',') : excludeSlug;
    if (excludes) queryParams.set('excludeSlug', excludes);
  }

  const url = enabled ? `/api/content/${kind}/list?${queryParams.toString()}` : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    fallbackData,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  return {
    items: Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [],
    total: data?.meta?.pagination?.total || 0,
    isLoading: enabled ? isLoading : false,
    isError: !!error,
    refresh: mutate,
  };
}

export interface ContentTag {
  tag: string;
  count: number;
}

/**
 * The tags endpoint answers with a bare array, while some Strapi responses come
 * wrapped in `{ data: [...] }`. Accepting both is deliberate: assuming the
 * wrapper silently produced an empty tag list on every list page, which looks
 * exactly like "still loading" and so went unnoticed.
 */
function normalizeTags(payload: unknown): ContentTag[] {
  if (Array.isArray(payload)) return payload as ContentTag[];
  const inner = (payload as { data?: unknown } | null | undefined)?.data;
  if (Array.isArray(inner)) return inner as ContentTag[];
  return [];
}

export function useContentTags(kind: ContentKind, lang: string = 'de') {
  const { data, error, isLoading } = useSWR<ContentTag[] | { data: ContentTag[] }>(
    `/api/content/${kind}/tags?lang=${lang}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    tags: normalizeTags(data),
    isLoading,
    isError: !!error,
  };
}

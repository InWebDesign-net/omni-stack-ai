import useSWR from 'swr';

export interface UseImagesParams {
  currentPage?: number;
  pageSize?: number | string;
  sort?: string;
  searchTerm?: string;
  filterFavorites?: string;
  includedTags?: string[];
  excludedTags?: string[];
  matchMode?: 'any' | 'all';
  lang?: 'de' | 'en';
  excludeSlug?: string | string[];
  enabled?: boolean;
  fallbackData?: any;
}

export interface ImageAuthor {
  id?: number;
  documentId?: string;
  username?: string;
  handle?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface ImageItem {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  summary?: string;
  content?: string;
  tags?: string[];
  viewsCount?: number;
  likesCount?: number;
  commentsCount?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  createdAt?: string;
  creator?: ImageAuthor;
  isProcessing?: boolean;
}

export interface UseImagesResult {
  images: ImageItem[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  refresh: () => void;
}

const fetcher = async (url: string) => {
  const jwt = typeof window !== 'undefined' ? localStorage.getItem('omni_jwt') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error('Failed to fetch images');
  }
  return res.json();
};

export function useImages(params: UseImagesParams = {}): UseImagesResult {
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
    enabled = true,
    fallbackData,
  } = params || {};

  const queryParams = new URLSearchParams();
  queryParams.set('page', (currentPage || 1).toString());
  queryParams.set('pageSize', (pageSize || 24).toString());
  queryParams.set('sort', sort || 'createdatasc');
  queryParams.set('lang', lang || 'de');

  const safeSearch = (searchTerm || '').trim();
  if (safeSearch) {
    queryParams.set('q', safeSearch);
  }
  if (filterFavorites) {
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
  if (matchMode === 'all') {
    queryParams.set('matchmode', 'all');
  }
  if (params.excludeSlug) {
    const excludes = Array.isArray(params.excludeSlug) ? params.excludeSlug.join(',') : params.excludeSlug;
    if (excludes) queryParams.set('excludeSlug', excludes);
  }

  if (sort === 'affinity' && typeof window !== 'undefined') {
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
    } catch (e) { console.error('[useImages] could not derive topic filter from affinity profile:', e); }
  }

  const url = enabled ? `/api/content/image/list?${queryParams.toString()}` : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    fallbackData,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  return {
    images: data?.data || [],
    total: data?.meta?.pagination?.total || 0,
    isLoading: enabled ? isLoading : false,
    isError: !!error,
    refresh: mutate,
  };
}

export function useImageTags(lang: string = 'de') {
  const { data, error, isLoading } = useSWR<{ data: { tag: string; count: number }[] }>(
    `/api/content/image/tags?lang=${lang}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    tags: data?.data || [],
    isLoading,
    isError: !!error,
  };
}

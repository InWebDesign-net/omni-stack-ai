import useSWR from 'swr';

export interface UseVideosParams {
  currentPage: number;
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

export interface VideoAuthor {
  id?: number;
  documentId?: string;
  username?: string;
  handle?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface VideoItem {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  summary?: string;
  tags?: string[];
  viewsCount?: number;
  likesCount?: number;
  commentsCount?: number;
  mp4Url?: string;
  hlsUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  createdAt?: string;
  creator?: VideoAuthor;
  isProcessing?: boolean;
}

export interface UseVideosResult {
  videos: VideoItem[];
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
    throw new Error('Failed to fetch videos');
  }
  return res.json();
};

export const useVideos = ({
  currentPage = 1,
  pageSize = 24,
  sort = 'createdatasc',
  searchTerm = '',
  filterFavorites = 'false',
  includedTags = [],
  excludedTags = [],
  matchMode = 'any',
  lang = 'de',
  excludeSlug,
  enabled = true,
  fallbackData,
}: UseVideosParams): UseVideosResult => {
  const queryParams = new URLSearchParams();
  queryParams.set('page', currentPage.toString());
  queryParams.set('pageSize', pageSize.toString());
  queryParams.set('sort', sort);
  if (lang) queryParams.set('lang', lang);

  if (sort === 'affinity' || sort === 'personal') {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('omni_user_interest_profile') : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        const topics = Object.keys(parsed.topics || {}).join(',');
        if (topics) {
          queryParams.set('userTopics', topics);
        }
      }
    } catch (e) { /* corrupt or absent localStorage entry — falling back to defaults */ }
  }

  if (searchTerm) {
    queryParams.set('q', searchTerm);
  }
  if (filterFavorites === 'true') {
    queryParams.set('fav', 'true');
  }
  if (includedTags.length) {
    queryParams.set('includetag', includedTags.join(','));
  }
  if (excludedTags.length) {
    queryParams.set('excludetag', excludedTags.join(','));
  }
  if (excludeSlug) {
    const excludes = Array.isArray(excludeSlug) ? excludeSlug.join(',') : excludeSlug;
    if (excludes) queryParams.set('excludeSlug', excludes);
  }
  if (matchMode && matchMode !== 'any') {
    queryParams.set('matchmode', matchMode);
  }

  const url = `/api/content/video/list?${queryParams.toString()}`;

  const { data, error, isLoading, mutate } = useSWR(
    enabled ? url : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      fallbackData,
    }
  );

  return {
    videos: data?.data || [],
    total: data?.meta?.pagination?.total || 0,
    isLoading,
    isError: Boolean(error),
    refresh: mutate,
  };
};

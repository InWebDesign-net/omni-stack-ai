import useSWR from 'swr';

export interface ArticleItem {
  id?: string | number;
  documentId?: string;
  slug?: string;
  title: string;
  summary?: any;
  thumbnail?: string;
  creator?: { id?: string | number; username?: string; avatarUrl?: string };
  authorName?: string;
  viewsCount?: number;
  likesCount?: number;
  commentsCount?: number;
  tags?: string[];
  createdAt?: string;
}

interface UseArticlesParams {
  currentPage?: number;
  pageSize?: number;
  sort?: string;
  searchTerm?: string;
  filterFavorites?: string;
  includedTags?: string[];
  excludedTags?: string[];
  matchMode?: 'any' | 'all';
  lang?: string;
  enabled?: boolean;
  excludeSlug?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useArticles(params: UseArticlesParams = {}) {
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
    excludeSlug,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set('page', currentPage.toString());
  queryParams.set('pageSize', pageSize.toString());
  queryParams.set('sort', sort);
  queryParams.set('lang', lang);

  if (searchTerm) queryParams.set('q', searchTerm);
  if (filterFavorites) queryParams.set('favsOnly', 'true');
  if (includedTags.length > 0) queryParams.set('includetag', includedTags.join(','));
  if (excludedTags.length > 0) queryParams.set('excludetag', excludedTags.join(','));
  if (matchMode === 'all') queryParams.set('matchmode', 'all');
  if (excludeSlug) queryParams.set('excludeSlug', excludeSlug);

  const url = enabled ? `/api/article/list?${queryParams.toString()}` : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  return {
    articles: Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [],
    total: data?.meta?.pagination?.total || 0,
    isLoading: enabled ? isLoading : false,
    isError: !!error,
    refresh: mutate,
  };
}

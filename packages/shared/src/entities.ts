export interface StrapiUser {
  id: number;
  documentId?: string;
  username: string;
  email?: string;
  handle?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface StrapiBaseMediaItem {
  id: number | string;
  documentId: string;
  title: string;
  slug: string;
  summary?: string;
  tags?: string[];
  viewsCount?: number;
  likesCount?: number;
  commentsCount?: number;
  visibility?: 'public' | 'unlisted' | 'subscribers' | 'private';
  locale?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  creator?: StrapiUser;
}

export interface VideoItem extends StrapiBaseMediaItem {
  mp4Url?: string;
  hlsUrl?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  isProcessing?: boolean;
}

export interface ImageItem extends StrapiBaseMediaItem {
  imageUrl?: string;
  thumbnailUrl?: string;
  isProcessing?: boolean;
}

export interface ArticleItem extends StrapiBaseMediaItem {
  content?: string;
  blocks?: unknown[];
  thumbnail?: string;
  authorName?: string;
}

export interface FeedItem extends StrapiBaseMediaItem {
  mediaType?: 'video' | 'image' | 'article' | 'short';
  itemRef?: VideoItem | ImageItem | ArticleItem;
}

export interface StrapiPaginatedMeta {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
}

export interface StrapiListResponse<T> {
  data: T[];
  meta: StrapiPaginatedMeta;
}

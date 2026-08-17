/**
 * Shared CMS TypeScript interfaces.
 *
 * These types describe the common Strapi Document Service shapes used by
 * feed, tracking, and interaction services. Fields are intentionally loose
 * (many optional) because the underlying Strapi data is dynamic and legacy
 * payloads still need to be accepted at runtime.
 */

export interface User {
  id?: number | string;
  documentId?: string;
  username?: string;
  email?: string;
  handle?: string;
  avatarUrl?: string;
  bio?: string;
  subscribersCount?: number;
  affinityGraph?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeedItem {
  id?: number | string;
  documentId?: string;
  title?: string;
  slug?: string;
  summary?: unknown;
  content?: unknown;
  mediaType?: 'video' | 'pdf' | 'article' | 'short' | 'image' | string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  isProcessing?: boolean;
  isForSale?: boolean;
  price?: number;
  tags?: string[];
  viewsCount?: number;
  likesCount?: number;
  isSubscribedAuthor?: boolean;
  visibility?: 'public' | 'private' | string;
  locale?: string;
  author?: User | number | string | null;
  creator?: User | number | string | null;
  blocks?: Array<Record<string, unknown>>;
  video?: Record<string, unknown> | null;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Video documents extend FeedItem so feed assembly can treat them uniformly. */
export interface Video extends FeedItem {
  mp4Url?: string;
  hlsUrl?: string;
  ogImageUrl?: string;
}

/** Unified content item used internally by feed assembly. */
export type ContentItem = FeedItem & {
  creatorAffinity?: number;
  relevanceScore?: number;
  bucketSource?: string;
  slotIndex?: number;
};

export interface Image {
  id?: number | string;
  documentId?: string;
  slug?: string;
  title?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  isProcessing?: boolean;
  tags?: string[];
  viewsCount?: number;
  likesCount?: number;
  locale?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id?: number | string;
  documentId?: string;
  content?: string;
  senderType?: 'user' | 'ai' | string;
  sender?: User | number | string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatRoom {
  id?: number | string;
  documentId?: string;
  name?: string;
  participants?: User[] | number[] | string[];
  messages?: ChatMessage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Subscription {
  id?: number | string;
  documentId?: string;
  subscriber?: User | number | string | null;
  creator?: User | number | string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Favorite {
  id?: number | string;
  documentId?: string;
  userIdentifier?: string;
  user?: User | number | string | null;
  video?: Video | number | string | null;
  image?: Image | number | string | null;
  feedItem?: FeedItem | number | string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  id?: number | string;
  documentId?: string;
  type?: string;
  message?: string;
  read?: boolean;
  recipient?: User | number | string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TrackingEvent {
  type: 'view' | 'click' | 'like' | 'unlike' | 'completion' | 'share' | 'comment';
  tags: string[];
  mediaType?: 'video' | 'pdf' | 'article' | 'short' | string;
  creatorId?: string | number;
  timestamp?: string;
}

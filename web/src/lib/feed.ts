import { AVATAR_PLACEHOLDER, resolveAvatarUrl } from '@/lib/avatar';
export interface FeedItemAuthor {
  id?: number;
  username: string;
  handle: string;
  avatarUrl: string;
  bio?: string;
  subscribersCount?: number;
}

export interface FeedItem {
  id: number;
  documentId?: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  mediaType: 'video' | 'pdf' | 'article' | 'short';
  mediaUrl: string;
  /**
   * The two renditions as `api::video.video` names them. `mediaUrl` above is
   * the generic "whatever plays" URL; these two let a player choose, which
   * matters because HLS needs hls.js outside Safari while the MP4 does not.
   */
  hlsUrl?: string;
  mp4Url?: string;
  thumbnailUrl: string;
  authorName?: string;
  authorAvatar?: string;
  isSubscribedAuthor?: boolean;
  tags: string[];
  viewsCount: number;
  likesCount: number;
  publishedAt?: string;
  relevanceScore: number;
  bucketSource?: string;
  slotIndex?: number;
  author?: FeedItemAuthor;
  isProcessing?: boolean;
}


/*
 * These read `creator` as well as `author`, because the two shapes reach them
 * from different places: a feed item carries `author`, while a video carries
 * `creator` — and the vertical feed is built from videos. Reading only `author`
 * meant every short fell through to the generic name, handle and placeholder
 * avatar, so the creator badge there never showed a real creator.
 */
export function getAuthorName(item: FeedItem): string {
  return item.author?.username || (item as any).creator?.username || item.authorName || 'Omni Creator';
}

export function getAuthorHandle(item: FeedItem): string {
  const handle = item.author?.handle || (item as any).creator?.handle;
  if (handle) {
    const h = String(handle).trim();
    return h.startsWith('@') ? h : `@${h}`;
  }
  const fallback = (getAuthorName(item)).toLowerCase().replace(/[^a-z0-9]/g, '');
  return `@${fallback || 'creator'}`;
}

export function getAuthorAvatar(item: FeedItem): string {
  return resolveAvatarUrl(
    item.author?.avatarUrl || (item as any).creator?.avatarUrl || item.authorAvatar
  );
}



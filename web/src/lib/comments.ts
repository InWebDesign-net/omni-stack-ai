import { formatRelativeDate } from '@/lib/date';
import { AVATAR_PLACEHOLDER, resolveAvatarUrl } from '@/lib/avatar';

export interface CommentItem {
  id: number | string;
  documentId?: string;
  text: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  isEdited?: boolean;
  feedSlug: string;
  createdAt?: string;
  isCurrentUser?: boolean;
  parentId?: string | number | null;
  depth?: number;
  repliesCount?: number;
  replies?: CommentItem[];
}

export function buildCommentTree(flatComments: CommentItem[]): CommentItem[] {
  const itemMap = new Map<string | number, CommentItem>();
  const rootComments: CommentItem[] = [];

  // First pass: clone all items and store in map
  flatComments.forEach((c) => {
    const key = c.documentId || c.id;
    itemMap.set(key, { ...c, replies: [] });
  });

  // Second pass: link children to parents
  flatComments.forEach((c) => {
    const key = c.documentId || c.id;
    const item = itemMap.get(key);
    if (!item) return;

    if (c.parentId && itemMap.has(c.parentId)) {
      const parent = itemMap.get(c.parentId);
      if (parent) {
        if (!parent.replies) parent.replies = [];
        parent.replies.push(item);
      }
    } else {
      rootComments.push(item);
    }
  });

  return rootComments;
}

export async function fetchCommentsForSlug(
  slug: string,
  lang: 'de' | 'en' = 'de'
): Promise<CommentItem[]> {
  try {
    const res = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) return [];

    const rawList: CommentItem[] = json.data.map((item: any) => {
      const parentObj = item.parent;
      const parentId = parentObj ? (parentObj.documentId || parentObj.id) : null;

      return {
        id: item.documentId || item.id,
        documentId: item.documentId,
        text: item.text,
        authorName: item.authorName || 'Gast',
        authorHandle: item.authorHandle || '@gast',
        authorAvatar: item.authorAvatar || '',
        isEdited: item.isEdited || false,
        feedSlug: item.feedSlug,
        createdAt: formatRelativeDate(item.createdAt, lang) || 'Gerade eben',
        parentId,
        depth: item.depth || 0,
        repliesCount: item.repliesCount || 0,
        replies: [],
      };
    });

    return buildCommentTree(rawList);
  } catch (error) {
    console.error('Error in fetchCommentsForSlug:', error);
    return [];
  }
}

export async function createCommentInStrapi(params: {
  feedSlug: string;
  text: string;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  parentId?: string | number | null;
}): Promise<CommentItem | null> {
  try {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;

    const item = json.data;
    return {
      id: item.documentId || item.id,
      documentId: item.documentId,
      text: item.text,
      authorName: item.authorName || params.authorName || 'Du',
      authorHandle: item.authorHandle || params.authorHandle || '@du',
      authorAvatar: item.authorAvatar || resolveAvatarUrl(params.authorAvatar),
      isEdited: item.isEdited || false,
      feedSlug: item.feedSlug,
      createdAt: 'Gerade eben',
      isCurrentUser: true,
      parentId: params.parentId || null,
      depth: item.depth || (params.parentId ? 1 : 0),
      repliesCount: 0,
      replies: [],
    };
  } catch (error) {
    console.error('Error in createCommentInStrapi:', error);
    return null;
  }
}

export async function updateCommentInStrapi(
  documentIdOrId: string | number,
  newText: string
): Promise<boolean> {
  try {
    const res = await fetch('/api/comments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: documentIdOrId,
        text: newText,
      }),
    });
    return res.ok;
  } catch (error) {
    console.error('Error in updateCommentInStrapi:', error);
    return false;
  }
}

export async function deleteCommentFromStrapi(documentIdOrId: string | number): Promise<boolean> {
  try {
    const res = await fetch(`/api/comments?id=${encodeURIComponent(documentIdOrId)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (error) {
    console.error('Error in deleteCommentFromStrapi:', error);
    return false;
  }
}

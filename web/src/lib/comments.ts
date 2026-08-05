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
}

export async function fetchCommentsForSlug(slug: string): Promise<CommentItem[]> {
  try {
    const res = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) return [];

    return json.data.map((item: any) => ({
      id: item.documentId || item.id,
      documentId: item.documentId,
      text: item.text,
      authorName: item.authorName || 'Gast',
      authorHandle: item.authorHandle || '@gast',
      authorAvatar: item.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
      isEdited: item.isEdited || false,
      feedSlug: item.feedSlug,
      createdAt: item.createdAt
        ? new Date(item.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        : 'Gerade eben',
    }));
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
      authorAvatar: item.authorAvatar || params.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
      isEdited: item.isEdited || false,
      feedSlug: item.feedSlug,
      createdAt: 'Gerade eben',
      isCurrentUser: true,
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

'use server';

import { getCurrentUserFromCookies } from '@/lib/auth-server';

export interface ArticleOwnerStatus {
  isOwner: boolean;
  articleExists: boolean;
}

/**
 * Server-side check whether the currently authenticated user owns the article
 * identified by `slug`.
 */
export async function getArticleOwnerStatus(slug: string): Promise<ArticleOwnerStatus> {
  if (!slug) return { isOwner: false, articleExists: false };

  try {
    const { user } = await getCurrentUserFromCookies();
    if (!user) return { isOwner: false, articleExists: false };

    const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (process.env.STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
    }
    if (user?.id) {
      headers['x-omni-user-id'] = String(user.id);
    }

    const res = await fetch(
      `${strapiUrl}/api/articles?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=creator&locale=*`,
      { headers, cache: 'no-store' }
    );

    if (!res.ok) return { isOwner: false, articleExists: false };

    const data = await res.json();
    const itemList = data?.data || [];
    if (itemList.length === 0) return { isOwner: false, articleExists: false };

    const itemWithCreator = itemList.find((v: any) => v.creator || v.author) || itemList[0];
    const creator = itemWithCreator?.creator || itemWithCreator?.author;

    const isOwner = Boolean(
      user &&
        creator &&
        (
          (user.id != null && creator.id != null && String(user.id) === String(creator.id)) ||
          ((user as any).documentId && creator.documentId && String((user as any).documentId) === String(creator.documentId)) ||
          (user.handle && creator.handle && String(user.handle).replace(/^@/, '').toLowerCase() === String(creator.handle).replace(/^@/, '').toLowerCase()) ||
          (user.username && creator.username && String(user.username).toLowerCase() === String(creator.username).toLowerCase())
        )
    );

    return { isOwner, articleExists: true };
  } catch (error) {
    console.error('Error in getArticleOwnerStatus server action:', error);
    return { isOwner: false, articleExists: false };
  }
}

import { NextRequest, NextResponse } from 'next/server';

/**
 * One page of a profile's likes.
 *
 * The previous version of this route took a comma-separated list of slugs from
 * the caller, which was how likes worked before they were persisted: they lived
 * in `localStorage` and the server only resolved them. Nothing called it. Since
 * #122 the heart writes an `api::favorite` row, so this reads that collection
 * instead.
 *
 * It cannot go through `/api/content/{kind}/list` like the other profile tabs:
 * a like joins four content types, and the filtered services each know exactly
 * one.
 */

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

/** The shape the cards render, whichever kind the like points at. */
function toCard(entry: Record<string, any>): Record<string, any> | null {
  if (entry.video) {
    return { ...entry.video, mediaType: 'video' };
  }
  if (entry.image) {
    return {
      documentId: entry.image.documentId,
      slug: entry.image.slug,
      title: entry.image.title,
      thumbnailUrl: entry.image.thumbnailUrl || entry.image.imageUrl,
      summary: entry.image.summary,
      viewsCount: entry.image.viewsCount || 0,
      likesCount: entry.image.likesCount || 0,
      mediaType: 'image',
    };
  }
  if (entry.article) {
    return {
      documentId: entry.article.documentId,
      slug: entry.article.slug,
      title: entry.article.title,
      thumbnailUrl: entry.article.thumbnail || entry.article.thumbnailUrl,
      summary: entry.article.summary,
      viewsCount: entry.article.viewsCount || 0,
      likesCount: entry.article.likesCount || 0,
      mediaType: 'article',
    };
  }
  if (entry.feedItem) {
    return {
      documentId: entry.feedItem.documentId,
      slug: entry.feedItem.slug,
      title: entry.feedItem.title,
      thumbnailUrl: entry.feedItem.thumbnailUrl,
      summary: entry.feedItem.summary,
      viewsCount: entry.feedItem.viewsCount || 0,
      likesCount: entry.feedItem.likesCount || 0,
      mediaType: 'feed',
    };
  }
  // A row whose target was deleted before the cleanup in #121 existed.
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(60, Math.max(1, parseInt(searchParams.get('pageSize') || '24', 10)));

  const empty = { data: [], meta: { pagination: { total: 0, page, pageSize, pageCount: 0 } } };
  if (!userId) return NextResponse.json(empty);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.STRAPI_API_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
  }

  try {
    const params = new URLSearchParams();
    params.set('filters[user][id][$eq]', String(userId));
    params.set('pagination[page]', String(page));
    params.set('pagination[pageSize]', String(pageSize));
    params.set('sort', 'createdAt:desc');
    params.set('populate', 'video,image,article,feedItem');

    const res = await fetch(`${STRAPI_URL}/api/favorites?${params.toString()}`, {
      headers,
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json(empty, { status: res.status });

    const json = await res.json();
    const cards = (json?.data || []).map(toCard).filter(Boolean);

    return NextResponse.json({
      data: cards,
      // The pagination is the favourites' own. A page can render fewer cards
      // than it holds rows if one still points at deleted content, which is why
      // the tab shows the total rather than counting what it drew.
      meta: json?.meta || { pagination: { total: cards.length, page, pageSize, pageCount: 1 } },
    });
  } catch (error) {
    console.error('GET /api/profile/favorites error:', error);
    return NextResponse.json(empty, { status: 500 });
  }
}

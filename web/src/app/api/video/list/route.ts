import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get('page') || searchParams.get('pagination[page]') || '1';
    const pageSize = searchParams.get('pageSize') || searchParams.get('pagination[pageSize]') || '24';
    const sort = searchParams.get('sort') || 'createdatasc';
    const searchTerm = searchParams.get('q') || searchParams.get('searchTerm') || '';
    const filterFavorites = searchParams.get('fav') || searchParams.get('filterFavorites') || 'false';

    // Map sort parameter to Strapi sort format
    const sortMapping: Record<string, string> = {
      createdatasc: 'createdAt:desc',  // Newest first
      createdatdesc: 'createdAt:asc',   // Oldest first
      titleasc: 'title:asc',
      titledesc: 'title:desc',
      durationasc: 'duration:asc',
      durationdesc: 'duration:desc',
    };
    const strapiSort = sortMapping[sort.toLowerCase()] || 'createdAt:desc';

    const strapiParams = new URLSearchParams();
    strapiParams.set('pagination[page]', page);
    strapiParams.set('pagination[pageSize]', pageSize);
    strapiParams.set('sort', strapiSort);
    strapiParams.set('populate', 'creator');
    strapiParams.set('locale', '*');

    // Filter by visibility public
    strapiParams.set('filters[visibility][$eq]', 'public');

    // Filter out items that are still processing
    strapiParams.set('filters[isProcessing][$ne]', 'true');

    if (searchTerm) {
      strapiParams.set('filters[title][$containsi]', searchTerm);
    }

    const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
    const targetUrl = `${strapiUrl}/api/videos?${strapiParams.toString()}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (process.env.STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ data: [], meta: { pagination: { total: 0 } } }, { status: res.status });
    }

    const data = await res.json();
    const rawItems = data?.data || [];
    const itemMap = new Map<string, any>();
    for (const item of rawItems) {
      const key = item.slug || item.documentId || item.id;
      if (!itemMap.has(key)) {
        itemMap.set(key, item);
      } else if (!itemMap.get(key).creator && item.creator) {
        itemMap.set(key, item);
      }
    }
    const deduplicatedItems = Array.from(itemMap.values());

    return NextResponse.json({
      ...data,
      data: deduplicatedItems,
    });
  } catch (error: any) {
    console.error('Error fetching video list from Strapi:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch video list' },
      { status: 500 }
    );
  }
}

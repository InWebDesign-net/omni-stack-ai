import { NextResponse } from 'next/server';
import { matchesTagFilter, TagFilterSpec } from '@/lib/videoFilters';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || searchParams.get('pagination[page]') || '1', 10);
    const requestedPageSize = parseInt(searchParams.get('pageSize') || searchParams.get('pagination[pageSize]') || '24', 10);
    const sort = searchParams.get('sort') || 'createdatasc';
    const searchTerm = searchParams.get('q') || searchParams.get('searchTerm') || '';
    const filterFavorites = searchParams.get('fav') || searchParams.get('filterFavorites') || 'false';

    // Tag filters (applied locally, see K2 in FILTER_PLAN.md)
    const includetag = searchParams.get('includetag') || '';
    const excludetag = searchParams.get('excludetag') || '';
    const matchmode = searchParams.get('matchmode') || 'any';
    const tagSpec: TagFilterSpec = {
      include: includetag ? includetag.split(',').map((t) => t.trim()).filter(Boolean) : [],
      exclude: excludetag ? excludetag.split(',').map((t) => t.trim()).filter(Boolean) : [],
      matchMode: matchmode === 'all' ? 'all' : 'any',
    };
    const hasTagFilter = tagSpec.include.length > 0 || tagSpec.exclude.length > 0;

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
    // Fetch full candidate set so deduplication and tag filtering reflect true total
    strapiParams.set('pagination[page]', '1');
    strapiParams.set('pagination[pageSize]', '1000');
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
      return NextResponse.json({ data: [], meta: { pagination: { total: 0, page, pageSize: requestedPageSize, pageCount: 0 } } }, { status: res.status });
    }

    const data = await res.json();
    const rawItems = data?.data || [];

    // (2) Multi-locale deduplication — MUST remain (K3 in FILTER_PLAN.md)
    const itemMap = new Map<string, any>();
    for (const item of rawItems) {
      const key = item.slug || item.documentId || item.id;
      if (!itemMap.has(key)) {
        itemMap.set(key, item);
      } else if (!itemMap.get(key).creator && item.creator) {
        itemMap.set(key, item);
      }
    }
    let items = Array.from(itemMap.values());

    // (3) Local tag filtering (database-independent, reliable)
    if (hasTagFilter) {
      items = items.filter((it: any) => matchesTagFilter({ tags: it.tags }, tagSpec));
    }

    // (4) Recompute pagination on the (possibly filtered) set
    const total = items.length;
    const pageSize = requestedPageSize;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), pageCount);
    const start = (safePage - 1) * pageSize;
    const pagedItems = items.slice(start, start + pageSize);

    return NextResponse.json({
      data: pagedItems,
      meta: {
        pagination: {
          page: safePage,
          pageSize,
          total,
          pageCount,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching video list from Strapi:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch video list' },
      { status: 500 }
    );
  }
}

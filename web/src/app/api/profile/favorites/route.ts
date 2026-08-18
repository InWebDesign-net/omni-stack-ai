import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth-server';

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

export async function GET(req: NextRequest) {
  try {
    const { user: viewer } = await getCurrentUserFromCookies();
    
    // Get liked IDs from localStorage on client, but for SSR we need a different approach
    // We'll return an aggregation endpoint that takes slugs as query params
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '24', 10);
    const lang = searchParams.get('lang') || 'de';
    
    // Get slugs from query param (comma-separated)
    const slugsParam = searchParams.get('slugs') || '';
    const slugs = slugsParam ? slugsParam.split(',').filter(Boolean) : [];
    
    if (slugs.length === 0) {
      return NextResponse.json({ data: [], meta: { pagination: { total: 0, page, pageSize, pageCount: 0 } } });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (process.env.STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
    }

    const results: any[] = [];
    
    // Fetch videos
    if (type === 'all' || type === 'videos') {
      const videoFilters = slugs.map((s) => `filters[slug][$eq]=${encodeURIComponent(s)}`).join('&');
      const videoRes = await fetch(
        `${STRAPI_URL}/api/videos?populate=creator&locale=*&${videoFilters}`,
        { headers, cache: 'no-store' }
      );
      if (videoRes.ok) {
        const data = await videoRes.json();
        for (const item of data?.data || []) {
          results.push({ ...item, mediaType: 'video' });
        }
      }
    }

    // Fetch images
    if (type === 'all' || type === 'images') {
      const imageFilters = slugs.map((s) => `filters[slug][$eq]=${encodeURIComponent(s)}`).join('&');
      const imageRes = await fetch(
        `${STRAPI_URL}/api/images?populate=creator&locale=*&${imageFilters}`,
        { headers, cache: 'no-store' }
      );
      if (imageRes.ok) {
        const data = await imageRes.json();
        for (const item of data?.data || []) {
          results.push({ ...item, mediaType: 'image' });
        }
      }
    }

    // Fetch articles
    if (type === 'all' || type === 'articles') {
      const articleFilters = slugs.map((s) => `filters[slug][$eq]=${encodeURIComponent(s)}`).join('&');
      const articleRes = await fetch(
        `${STRAPI_URL}/api/articles?populate=creator&locale=*&${articleFilters}`,
        { headers, cache: 'no-store' }
      );
      if (articleRes.ok) {
        const data = await articleRes.json();
        for (const item of data?.data || []) {
          results.push({ ...item, mediaType: 'article' });
        }
      }
    }

    const total = results.length;
    const start = (page - 1) * pageSize;
    const paginatedData = results.slice(start, start + pageSize);

    return NextResponse.json({
      data: paginatedData,
      meta: {
        pagination: {
          total,
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error: any) {
    console.error('[profile-favorites] error', error);
    return NextResponse.json(
      { error: error.message || 'Favorites API Error' },
      { status: 500 }
    );
  }
}

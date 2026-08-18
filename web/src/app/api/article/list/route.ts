import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

// GET /api/article/list - Filtered articles with pagination
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    
    const queryParams = new URLSearchParams();
    
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '24';
    const sort = searchParams.get('sort') || 'createdatasc';
    const lang = searchParams.get('lang') || 'de';
    const q = searchParams.get('q') || '';
    const includetag = searchParams.get('includetag') || '';
    const excludetag = searchParams.get('excludetag') || '';
    const matchmode = searchParams.get('matchmode') || '';
    
    queryParams.set('page', page);
    queryParams.set('pageSize', pageSize);
    queryParams.set('sort', sort);
    queryParams.set('lang', lang);
    
    if (q) queryParams.set('q', q);
    if (includetag) queryParams.set('includetag', includetag);
    if (excludetag) queryParams.set('excludetag', excludetag);
    if (matchmode) queryParams.set('matchmode', matchmode);
    
    const excludeSlug = searchParams.get('excludeSlug');
    if (excludeSlug) queryParams.set('excludeSlug', excludeSlug);

    const res = await fetch(`${STRAPI_URL}/api/articles/filtered?${queryParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[article-list-proxy] error', error);
    return NextResponse.json(
      { error: error.message || 'Article List Proxy Connection Error' },
      { status: 500 }
    );
  }
}

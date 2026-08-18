import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

// GET /api/article/tags - All article tags with counts
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get('lang') || 'de';

    const res = await fetch(`${STRAPI_URL}/api/articles/tags?lang=${lang}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch article tags' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[article-tags-proxy] error', error);
    return NextResponse.json(
      { error: error.message || 'Article Tags Proxy Connection Error' },
      { status: 500 }
    );
  }
}

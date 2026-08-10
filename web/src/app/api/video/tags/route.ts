import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
    const targetUrl = `${strapiUrl}/api/videos/tags`;

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
      return NextResponse.json({ data: [] }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data?.data || []);
  } catch (error: any) {
    console.error('Error fetching video tags from Strapi:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch video tags' },
      { status: 500 }
    );
  }
}

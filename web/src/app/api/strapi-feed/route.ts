import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = {
      ...body,
      locale: body.lang || body.locale || 'de',
    };
    
    // Proxy request to Strapi custom controller.
    // Forward the user's JWT so the feed engine ranks against their stored
    // affinityGraph; fall back to the server API token for anonymous requests.
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    };
    const clientAuth = req.headers.get('authorization');
    if (clientAuth) {
      headers['Authorization'] = clientAuth;
    } else if (process.env.STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337'}/api/feed/assembly`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }
  } catch (error: any) {
    console.error('Strapi Feed Proxy Error:', error);
  }

  return NextResponse.json({ error: 'Strapi Connection Fallback' }, { status: 500 });
}

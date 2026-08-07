import { NextResponse } from 'next/server';

/**
 * Persists the logged-in user's affinityGraph.
 * The client's JWT is forwarded to Strapi, which only ever writes the graph
 * of the authenticated user (see cms feed.updateProfile).
 */
export async function POST(req: Request) {
  try {
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

    const res = await fetch(`${strapiUrl}/api/feed/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Serverfehler' }, { status: 500 });
  }
}

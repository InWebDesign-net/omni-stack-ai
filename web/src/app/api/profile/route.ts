import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

/**
 * GET /api/profile
 * Fetches the logged-in user's profile and real affinityGraph from Strapi.
 */
export async function GET(req: Request) {
  try {
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const res = await fetch(`${STRAPI_URL}/api/users/me`, {
      headers: {
        'Authorization': authorization,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: res.status });
    }

    const user = await res.json();
    return NextResponse.json({
      user,
      affinityGraph: user.affinityGraph || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Serverfehler' }, { status: 500 });
  }
}

/**
 * POST /api/profile
 * Persists the logged-in user's affinityGraph into Strapi DB.
 */
export async function POST(req: Request) {
  try {
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();

    const res = await fetch(`${STRAPI_URL}/api/feed/profile`, {
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

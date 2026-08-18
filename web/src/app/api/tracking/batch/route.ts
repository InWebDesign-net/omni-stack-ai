import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

    // Strapi derives the user from the JWT (ctx.state.user) — body userId is ignored.
    // sendBeacon can't set headers, so the tracker puts the JWT into the body.
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const clientAuth = req.headers.get('authorization') || (body.jwt ? `Bearer ${body.jwt}` : null);
    if (clientAuth) {
      headers['Authorization'] = clientAuth;
    }
    delete body.jwt;

    const res = await fetch(`${strapiUrl}/api/tracking/batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (error: any) {
    console.error('Tracking Proxy Error:', error);
  }

  return NextResponse.json({ success: true, fallback: true });
}

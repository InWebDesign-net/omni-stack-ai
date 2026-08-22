import { NextResponse, type NextRequest } from 'next/server';

/**
 * The caller's token, from the Authorization header or from the session cookie.
 *
 * The token only reaches `localStorage` through the auth modal, while the login
 * route always sets an httpOnly `omni_jwt` cookie — so a session restored from
 * that cookie has no header to send. Reading both means this route works for a
 * signed-in visitor either way.
 */
function callerAuth(req: NextRequest): string | null {
  const header = req.headers.get('authorization');
  if (header && header !== 'Bearer null' && header !== 'Bearer undefined') {
    return header.startsWith('Bearer ') ? header : `Bearer ${header}`;
  }
  const cookieJwt = req.cookies.get('omni_jwt')?.value || req.cookies.get('omni_user_jwt')?.value;
  return cookieJwt ? `Bearer ${cookieJwt}` : null;
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

    // Strapi derives the user from the JWT (ctx.state.user) — body userId is ignored.
    // sendBeacon can't set headers, so the tracker puts the JWT into the body.
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const clientAuth = callerAuth(req) || (body.jwt ? `Bearer ${body.jwt}` : null);
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

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


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
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
    const clientAuth = callerAuth(req);
    if (clientAuth) {
      headers['Authorization'] = clientAuth;
    } else if (process.env.STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
    }

    const res = await fetch(`${process.env.STRAPI_URL || 'http://127.0.0.1:1337'}/api/feed/assembly`, {
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

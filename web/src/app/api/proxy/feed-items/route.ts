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


const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

// POST /api/proxy/feed-items → Strapi /api/feed-items
// Creates a new feed item (video/image/article). Requires authenticated user.
export async function POST(req: NextRequest) {
  try {
    // Auth: require client JWT
    const authHeader = callerAuth(req);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.text();

    const res = await fetch(`${STRAPI_URL}/api/feed-items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body,
    });

    const data = await res.json().catch(() => ({ message: 'Invalid response from upstream' }));
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error('[feed-items-proxy] error', error);
    return NextResponse.json(
      { error: error.message || 'Feed Items Proxy Connection Error' },
      { status: 500 }
    );
  }
}

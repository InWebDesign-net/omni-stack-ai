import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

async function resolveAuthHeader(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader !== 'Bearer null' && authHeader !== 'Bearer undefined') {
    return authHeader;
  }
  const cookieStore = await cookies();
  const jwt =
    cookieStore.get('omni_jwt')?.value ||
    cookieStore.get('omni_user_jwt')?.value;

  if (jwt) {
    return `Bearer ${jwt}`;
  }
  return null;
}

/**
 * GET /api/profile
 * Fetches the logged-in user's profile and real affinityGraph from Strapi.
 */
export async function GET(req: Request) {
  try {
    const authorization = await resolveAuthHeader(req);
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
 * Persists the logged-in user's profile fields and affinityGraph into Strapi DB.
 */
export async function POST(req: Request) {
  try {
    const authorization = await resolveAuthHeader(req);
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

    // Fallback: Also ensure avatarUrl is directly updated via Strapi API token if needed
    if (body.avatarUrl && data?.success !== false) {
      try {
        const meRes = await fetch(`${STRAPI_URL}/api/users/me`, {
          headers: { Authorization: authorization },
          cache: 'no-store',
        });
        if (meRes.ok) {
          const me = await meRes.json();
          const token = process.env.STRAPI_API_TOKEN || process.env.STRAPI_TOKEN;
          if (me?.id && token) {
            await fetch(`${STRAPI_URL}/api/users/${me.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                avatarUrl: body.avatarUrl,
                ...(body.username ? { username: body.username } : {}),
                ...(body.bio !== undefined ? { bio: body.bio } : {}),
              }),
            }).catch((e) => { console.error('Unhandled promise rejection:', e); });
          }
        }
      } catch (e) { console.error('[api/profile] failed to sync profile changes to Strapi:', e); }
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Serverfehler' }, { status: 500 });
  }
}

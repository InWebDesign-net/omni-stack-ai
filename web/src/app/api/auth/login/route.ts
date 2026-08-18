import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    // Rate limit: 5 login attempts per IP per minute
    const ip = getClientIp(req);
    const rateResult = checkRateLimit(`login:${ip}`, 5, 60_000);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { identifier, password } = await req.json();

    const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

    // Login user with Strapi users-permissions plugin
    const loginRes = await fetch(`${strapiUrl}/api/auth/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier,
        password,
      }),
    });

    const loginData = await loginRes.json();

    if (!loginRes.ok) {
      return NextResponse.json(
        { error: loginData?.error?.message || 'Ungültige Anmeldedaten.' },
        { status: loginRes.status }
      );
    }

    const { jwt, user } = loginData;

    // All profile fields are now directly on the user object
    const response = NextResponse.json({
      success: true,
      jwt,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        handle: user.handle,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        subscribersCount: user.subscribersCount,
        affinityGraph: user.affinityGraph,
      },
    });

    response.cookies.set('omni_jwt', jwt, {
      httpOnly: true,
      path: '/',
      maxAge: 2592000, // 30 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Serverfehler' }, { status: 500 });
  }
}

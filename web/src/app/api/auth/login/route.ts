import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();

    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

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

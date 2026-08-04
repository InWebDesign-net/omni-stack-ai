import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();

    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

    // 1. Login user with Strapi users-permissions plugin
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

    // 2. Fetch User Profile linked to this user
    let userProfile = null;
    try {
      const profileRes = await fetch(`${strapiUrl}/api/user-profiles?filters[username][$eq]=${encodeURIComponent(user.username)}`, {
        headers: {
          'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN || jwt}`,
        },
      });

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.data && profileData.data.length > 0) {
          userProfile = profileData.data[0];
        }
      }
    } catch (e) {
      console.error('Error fetching user profile:', e);
    }

    return NextResponse.json({
      success: true,
      jwt,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile: userProfile,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Serverfehler' }, { status: 500 });
  }
}

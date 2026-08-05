import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { username, email, password, bio } = await req.json();

    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

    // 1. Register User in Strapi users-permissions plugin
    const regRes = await fetch(`${strapiUrl}/api/auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password,
      }),
    });

    const regData = await regRes.json();

    if (!regRes.ok) {
      return NextResponse.json(
        { error: regData?.error?.message || 'Registrierung in Strapi fehlgeschlagen.' },
        { status: regRes.status }
      );
    }

    const { jwt, user } = regData;

    // 2. Create User Profile document in Strapi
    const defaultVector = {
      interests: {
        'Wissenschaft': { score: 0.90, last_interacted: new Date().toISOString() },
        'Natur': { score: 0.85, last_interacted: new Date().toISOString() },
        'Kochen': { score: 0.75, last_interacted: new Date().toISOString() },
        'Tech': { score: 0.88, last_interacted: new Date().toISOString() },
        'Finanzen': { score: 0.70, last_interacted: new Date().toISOString() },
        'Funny Cat Videos': { score: 0.20, last_interacted: new Date().toISOString() },
      },
      contentTypes: { pdf: 0.8, video: 0.9, article: 0.7, short: 0.5 },
      activePattern: 'discovery',
    };

    let userProfile = null;
    try {
      const profileRes = await fetch(`${strapiUrl}/api/user-profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN || jwt}`,
        },
        body: JSON.stringify({
          data: {
            username: user.username,
            bio: bio || 'Omni Community Mitglied',
            avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80`,
            affinityGraph: defaultVector,
            user: user.id,
          },
        }),
      });

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        userProfile = profileData.data;
      }
    } catch (e) {
      console.error('Failed to create user profile in Strapi:', e);
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

import { NextResponse } from 'next/server';
import { defaultAffinityGraph } from '@/lib/affinity';

export async function POST(req: Request) {
  try {
    const { username, email, password, bio } = await req.json();

    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

    // Register User in Strapi users-permissions plugin
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

    // Set initial profile fields directly on the user
    try {
      await fetch(`${strapiUrl}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN || jwt}`,
        },
        body: JSON.stringify({
          bio: bio || 'Omni Community Mitglied',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
          handle: `@${username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          affinityGraph: defaultAffinityGraph(),
        }),
      });
    } catch (e) {
      console.error('Failed to set initial user profile fields:', e);
    }

    // All profile fields are now directly on the user object
    const response = NextResponse.json({
      success: true,
      jwt,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        handle: user.handle || `@${username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        avatarUrl: user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
        bio: user.bio || bio || 'Omni Community Mitglied',
        subscribersCount: user.subscribersCount || 0,
      },
    });

    response.cookies.set('omni_jwt', jwt, {
      httpOnly: false,
      path: '/',
      maxAge: 2592000, // 30 days
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Serverfehler' }, { status: 500 });
  }
}

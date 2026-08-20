import { NextResponse } from 'next/server';
import { defaultAffinityGraph } from '@/lib/affinity';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { AVATAR_PLACEHOLDER, resolveAvatarUrl } from '@/lib/avatar';

export async function POST(req: Request) {
  try {
    // Rate limit: 3 registrations per IP per minute
    const ip = getClientIp(req);
    const rateResult = checkRateLimit(`register:${ip}`, 3, 60_000);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { username, email, password, bio } = await req.json();

    const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

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
          // No avatar is written at sign-up. Storing a stand-in makes "has not
          // chosen a picture" indistinguishable from "chose this one", and the
          // value it used to store was a photograph of a specific person.
          // An empty field lets the placeholder do its job and lets a later
          // upload replace nothing.
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
        avatarUrl: resolveAvatarUrl(user.avatarUrl),
        bio: user.bio || bio || 'Omni Community Mitglied',
        subscribersCount: user.subscribersCount || 0,
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

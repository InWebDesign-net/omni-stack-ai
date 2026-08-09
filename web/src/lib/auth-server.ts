import { cookies } from 'next/headers';

export interface ServerUserSession {
  id: number;
  username: string;
  email: string;
  handle?: string;
  avatarUrl?: string;
  bio?: string;
}

export async function getCurrentUserFromCookies(): Promise<{
  user: ServerUserSession | null;
  jwt: string | null;
}> {
  try {
    const cookieStore = await cookies();
    const jwt =
      cookieStore.get('omni_jwt')?.value ||
      cookieStore.get('omni_user_jwt')?.value ||
      null;

    if (!jwt) {
      return { user: null, jwt: null };
    }

    const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
    const res = await fetch(`${strapiUrl}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return { user: null, jwt: null };
    }

    const user = await res.json();
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        handle: user.handle,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
      },
      jwt,
    };
  } catch (error) {
    console.error('Error fetching current user from cookies:', error);
    return { user: null, jwt: null };
  }
}

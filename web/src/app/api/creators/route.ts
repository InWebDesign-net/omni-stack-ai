import { NextResponse } from 'next/server';
import { type StrapiUser } from '@omni/shared';
import { AVATAR_PLACEHOLDER, resolveAvatarUrl } from '@/lib/avatar';

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

export async function GET() {
  try {
    const res = await fetch(`${STRAPI_URL}/api/users`, {
      headers: STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {},
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ creators: [] });
    }

    const users: StrapiUser[] = await res.json();
    const creators = (users || []).map((u: StrapiUser & { subscribersCount?: number }) => ({
      id: String(u.id),
      documentId: u.documentId,
      username: u.username || 'Creator',
      handle: u.handle ? (u.handle.startsWith('@') ? u.handle : `@${u.handle}`) : `@user${u.id}`,
      avatarUrl: resolveAvatarUrl(u.avatarUrl),
      bio: u.bio || '',
      subscribersCount: Number(u.subscribersCount || 0),
    }));

    return NextResponse.json({ creators });
  } catch (error: unknown) {
    console.error('Error fetching creators:', error);
    return NextResponse.json({ creators: [] });
  }
}

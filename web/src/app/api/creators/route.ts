import { NextResponse } from 'next/server';
import { type StrapiUser } from '@omni/shared';

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
      avatarUrl: u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
      bio: u.bio || '',
      subscribersCount: Number(u.subscribersCount || 0),
    }));

    return NextResponse.json({ creators });
  } catch (error: unknown) {
    console.error('Error fetching creators:', error);
    return NextResponse.json({ creators: [] });
  }
}

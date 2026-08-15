import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

function getStrapiUrl(path: string) {
  return `${STRAPI_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  try {
    const res = await fetch(getStrapiUrl('/api/users/me'), {
      headers: { Authorization: authHeader },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser?.id) {
      return NextResponse.json({ favoriteVideoIds: [], favoriteFeedItemIds: [] });
    }

    const favRes = await fetch(
      getStrapiUrl(`/api/favorites?filters[user][id][$eq]=${authUser.id}&populate[video][fields][0]=id&populate[feedItem][fields][0]=id`),
      {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      }
    );

    if (!favRes.ok) {
      return NextResponse.json({ favoriteVideoIds: [], favoriteFeedItemIds: [] });
    }

    const favData = await favRes.json();
    const items = favData.data || [];

    const favoriteVideoIds: string[] = [];
    const favoriteFeedItemIds: string[] = [];

    items.forEach((item: any) => {
      const vId = item.attributes?.video?.data?.id || item.video?.id;
      const fId = item.attributes?.feedItem?.data?.id || item.feedItem?.id;
      if (vId) favoriteVideoIds.push(String(vId));
      if (fId) favoriteFeedItemIds.push(String(fId));
    });

    return NextResponse.json({ favoriteVideoIds, favoriteFeedItemIds });
  } catch (error: any) {
    console.error('GET /api/favorites error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { videoId, feedItemId } = body;

    if (!videoId && !feedItemId) {
      return NextResponse.json({ error: 'Missing videoId or feedItemId' }, { status: 400 });
    }

    const targetFilter = videoId
      ? `filters[user][id][$eq]=${authUser.id}&filters[video][id][$eq]=${videoId}`
      : `filters[user][id][$eq]=${authUser.id}&filters[feedItem][id][$eq]=${feedItemId}`;

    const existingRes = await fetch(getStrapiUrl(`/api/favorites?${targetFilter}`), {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    });

    let isFavorite = false;
    let recordId: string | null = null;

    if (existingRes.ok) {
      const data = await existingRes.json();
      if ((data.data || []).length > 0) {
        isFavorite = true;
        recordId = String(data.data[0].id);
      }
    }

    if (isFavorite && recordId) {
      // Toggle OFF (Delete favorite)
      await fetch(getStrapiUrl(`/api/favorites/${recordId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      });
      isFavorite = false;
    } else {
      // Toggle ON (Create favorite)
      const payload: any = {
        user: authUser.id,
        userIdentifier: authUser.username || authUser.handle || `user-${authUser.id}`,
      };
      if (videoId) payload.video = videoId;
      if (feedItemId) payload.feedItem = feedItemId;

      await fetch(getStrapiUrl('/api/favorites'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify({ data: payload }),
      });
      isFavorite = true;
    }

    return NextResponse.json({ isFavorite });
  } catch (error: any) {
    console.error('POST /api/favorites error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

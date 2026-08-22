import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth-server';

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
      return NextResponse.json({ favoriteVideoIds: [], favoriteImageIds: [], favoriteArticleIds: [], favoriteFeedItemIds: [] });
    }

    /*
     * This answers "which items has this user favourited", so a partial answer
     * is worse than none: the query carried no pagination, Strapi's
     * `defaultLimit` is 25, and everything past the 25th came back missing.
     *
     * The heart on those items then showed as empty. Clicking it did not add a
     * favourite either — the toggle looks the record up directly, finds the one
     * that exists, and removes it — so the user pressed "favourite" and
     * silently un-favourited something, with nothing on screen changing.
     *
     * Paged through with only the ids populated, which is all this endpoint
     * returns.
     */
    const PAGE_SIZE = 500;
    const items: Record<string, any>[] = [];
    let page = 1;
    let pageCount = 1;

    do {
      const favRes = await fetch(
        getStrapiUrl(
          `/api/favorites?filters[user][id][$eq]=${authUser.id}` +
            `&populate[video][fields][0]=id&populate[image][fields][0]=id&populate[article][fields][0]=id&populate[feedItem][fields][0]=id` +
            `&pagination[page]=${page}&pagination[pageSize]=${PAGE_SIZE}`
        ),
        {
          headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        }
      );

      if (!favRes.ok) {
        // A partial list would misreport the rest as un-favourited, so an
        // interrupted read reports nothing rather than something wrong.
        return NextResponse.json({ favoriteVideoIds: [], favoriteImageIds: [], favoriteArticleIds: [], favoriteFeedItemIds: [] });
      }

      const favData = await favRes.json();
      items.push(...(favData.data || []));
      pageCount = Number(favData?.meta?.pagination?.pageCount || 1);
      page += 1;
    } while (page <= pageCount);

    const favoriteVideoIds: string[] = [];
    const favoriteImageIds: string[] = [];
    const favoriteArticleIds: string[] = [];
    const favoriteFeedItemIds: string[] = [];

    items.forEach((item: Record<string, any>) => {
      const vId = item.attributes?.video?.data?.id || item.video?.id;
      const imgId = item.attributes?.image?.data?.id || item.image?.id;
      const artId = item.attributes?.article?.data?.id || item.article?.id;
      const fId = item.attributes?.feedItem?.data?.id || item.feedItem?.id;
      if (vId) favoriteVideoIds.push(String(vId));
      if (imgId) favoriteImageIds.push(String(imgId));
      if (artId) favoriteArticleIds.push(String(artId));
      if (fId) favoriteFeedItemIds.push(String(fId));
    });

    return NextResponse.json({ favoriteVideoIds, favoriteImageIds, favoriteArticleIds, favoriteFeedItemIds });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('GET /api/favorites error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user: authUser } = await getCurrentUserFromCookies();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { videoId, imageId, articleId, feedItemId, desired } = await req.json();

    if (!videoId && !imageId && !articleId && !feedItemId) {
      return NextResponse.json(
        { error: 'videoId, imageId, articleId or feedItemId required' },
        { status: 400 }
      );
    }

    let targetFilter = '';
    const payload: Record<string, unknown> = {
      user: authUser.id,
      userIdentifier: `user-${authUser.id}`,
    };

    if (videoId) {
      targetFilter = `filters[user][id][$eq]=${authUser.id}&filters[video][id][$eq]=${videoId}`;
      payload.video = videoId;
    } else if (imageId) {
      targetFilter = `filters[user][id][$eq]=${authUser.id}&filters[image][id][$eq]=${imageId}`;
      payload.image = imageId;
    } else if (articleId) {
      // `api::favorite.favorite` has had this relation all along; nothing wrote
      // or read it, so an article could be favourited only from outside the app
      // and its heart never showed the state.
      targetFilter = `filters[user][id][$eq]=${authUser.id}&filters[article][id][$eq]=${articleId}`;
      payload.article = articleId;
    } else if (feedItemId) {
      targetFilter = `filters[user][id][$eq]=${authUser.id}&filters[feedItem][id][$eq]=${feedItemId}`;
      payload.feedItem = feedItemId;
    }

    const existingRes = await fetch(getStrapiUrl(`/api/favorites?${targetFilter}`), {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
      },
    });

    const existingData = await existingRes.json();
    const existingList = existingData.data || [];

    /*
     * `desired` states the outcome the caller wants; without it the request
     * flips whatever is stored. Flipping is fine when the button's state and the
     * database agree, and silently inverts when they do not — the caller sees an
     * empty heart, presses "favourite", and the record is removed. Callers that
     * know what they want should say so.
     */
    if (typeof desired === 'boolean') {
      if (desired && existingList.length === 0) {
        await fetch(getStrapiUrl('/api/favorites'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
          },
          body: JSON.stringify({ data: payload }),
        });
      } else if (!desired && existingList.length > 0) {
        // documentId first. Strapi 5 addresses documents by documentId; handed a
        // numeric id it answers 200 and deletes nothing, so `id || documentId`
        // read like a fallback while never reaching the second operand — the
        // heart went empty and the record stayed.
        const recordId = existingList[0].documentId || existingList[0].id;
        await fetch(getStrapiUrl(`/api/favorites/${recordId}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` },
        });
      }
      return NextResponse.json({ favorited: desired });
    }

    if (existingList.length > 0) {
      // Toggle OFF (Delete favorite)
      // documentId first. Strapi 5 addresses documents by documentId; handed a
        // numeric id it answers 200 and deletes nothing, so `id || documentId`
        // read like a fallback while never reaching the second operand — the
        // heart went empty and the record stayed.
        const recordId = existingList[0].documentId || existingList[0].id;
      await fetch(getStrapiUrl(`/api/favorites/${recordId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
        },
      });
      return NextResponse.json({ favorited: false });
    } else {
      // Toggle ON (Create favorite)
      await fetch(getStrapiUrl('/api/favorites'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify({ data: payload }),
      });
      return NextResponse.json({ favorited: true });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('POST /api/favorites error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth-server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

function getStrapiUrl(path: string) {
  return `${STRAPI_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function GET(req: NextRequest) {
  try {
    /*
     * The same source of truth as POST below.
     *
     * This used to resolve the user from an `Authorization` header only, while
     * POST read the session cookie — so the write recorded a like the read
     * could never see. Once the token stopped being kept in `localStorage`
     * there was no header left to send, and every list came back empty. With
     * the heart then showing as un-liked, the next click removed the record
     * that was already there, exactly the failure the comment below warns
     * about.
     */
    const { user: authUser } = await getCurrentUserFromCookies();
    if (!authUser?.id) {
      return NextResponse.json({ likedVideoIds: [], likedImageIds: [], likedArticleIds: [], likedFeedItemIds: [] });
    }

    /*
     * This answers "which items has this user liked", so a partial answer
     * is worse than none: the query carried no pagination, Strapi's
     * `defaultLimit` is 25, and everything past the 25th came back missing.
     *
     * The heart on those items then showed as empty. Clicking it did not add a
     * like either — the toggle looks the record up directly, finds the one
     * that exists, and removes it — so the user pressed "like" and
     * silently un-liked something, with nothing on screen changing.
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
          `/api/likes?filters[user][id][$eq]=${authUser.id}` +
            // `documentId` comes back whether or not it is listed in `fields`,
            // but naming it keeps the intent visible next to the ids.
            `&populate[video][fields][0]=id&populate[image][fields][0]=id&populate[article][fields][0]=id&populate[feedItem][fields][0]=id` +
            `&pagination[page]=${page}&pagination[pageSize]=${PAGE_SIZE}`
        ),
        {
          headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        }
      );

      if (!favRes.ok) {
        // A partial list would misreport the rest as un-liked, so an
        // interrupted read reports nothing rather than something wrong.
        return NextResponse.json({ likedVideoIds: [], likedImageIds: [], likedArticleIds: [], likedFeedItemIds: [] });
      }

      const favData = await favRes.json();
      items.push(...(favData.data || []));
      pageCount = Number(favData?.meta?.pagination?.pageCount || 1);
      page += 1;
    } while (page <= pageCount);

    const likedVideoIds: string[] = [];
    const likedImageIds: string[] = [];
    const likedArticleIds: string[] = [];
    const likedFeedItemIds: string[] = [];

    /*
     * Also reported by `documentId`, and that is the identifier to match on.
     *
     * Content here is bilingual, so one image is several rows with different
     * numeric ids — the German row and the English row. A page renders whichever
     * its language picked and compares that id against this list, so a like made
     * in one language did not register in the other, and could match a different
     * row of the same document by coincidence. `documentId` is the same for all
     * of them. The numeric lists stay for callers that still use them.
     */
    const likedVideoDocumentIds: string[] = [];
    const likedImageDocumentIds: string[] = [];
    const likedArticleDocumentIds: string[] = [];
    const likedFeedItemDocumentIds: string[] = [];

    items.forEach((item: Record<string, any>) => {
      const video = item.attributes?.video?.data || item.video;
      const image = item.attributes?.image?.data || item.image;
      const article = item.attributes?.article?.data || item.article;
      const feedItem = item.attributes?.feedItem?.data || item.feedItem;

      if (video?.id) likedVideoIds.push(String(video.id));
      if (image?.id) likedImageIds.push(String(image.id));
      if (article?.id) likedArticleIds.push(String(article.id));
      if (feedItem?.id) likedFeedItemIds.push(String(feedItem.id));

      if (video?.documentId) likedVideoDocumentIds.push(String(video.documentId));
      if (image?.documentId) likedImageDocumentIds.push(String(image.documentId));
      if (article?.documentId) likedArticleDocumentIds.push(String(article.documentId));
      if (feedItem?.documentId) likedFeedItemDocumentIds.push(String(feedItem.documentId));
    });

    return NextResponse.json({
      likedVideoIds,
      likedImageIds,
      likedArticleIds,
      likedFeedItemIds,
      likedVideoDocumentIds,
      likedImageDocumentIds,
      likedArticleDocumentIds,
      likedFeedItemDocumentIds,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('GET /api/likes error:', error);
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

    /**
     * The document a numeric id belongs to.
     *
     * Content is bilingual: one image is several rows with different numeric
     * ids, one per language. Matching an existing like on the numeric id
     * therefore only ever found the like made in *that* language — so liking
     * the same picture in German and in English produced two rows, the count
     * was per language, and a heart could show empty on something the reader
     * had already liked. Existing likes are looked up by `documentId`, which is
     * the same for every language of one item.
     */
    const documentIdFor = async (plural: string, numericId: number | string): Promise<string | null> => {
      try {
        const res = await fetch(
          getStrapiUrl(`/api/${plural}?filters[id][$eq]=${numericId}&fields[0]=id&locale=*&pagination[pageSize]=1`),
          { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' }
        );
        if (!res.ok) return null;
        const json = await res.json();
        return (json?.data || [])[0]?.documentId || null;
      } catch {
        return null;
      }
    };

    let targetFilter = '';
    const payload: Record<string, unknown> = {
      user: authUser.id,
      userIdentifier: `user-${authUser.id}`,
    };

    /** Falls back to the numeric id when the document cannot be resolved. */
    const filterFor = async (relation: string, plural: string, numericId: number | string) => {
      const documentId = await documentIdFor(plural, numericId);
      return documentId
        ? `filters[user][id][$eq]=${authUser.id}&filters[${relation}][documentId][$eq]=${documentId}`
        : `filters[user][id][$eq]=${authUser.id}&filters[${relation}][id][$eq]=${numericId}`;
    };

    if (videoId) {
      targetFilter = await filterFor('video', 'videos', videoId);
      payload.video = videoId;
    } else if (imageId) {
      targetFilter = await filterFor('image', 'images', imageId);
      payload.image = imageId;
    } else if (articleId) {
      // `api::like.like` has had this relation all along; nothing wrote
      // or read it, so an article could be liked only from outside the app
      // and its heart never showed the state.
      targetFilter = await filterFor('article', 'articles', articleId);
      payload.article = articleId;
    } else if (feedItemId) {
      targetFilter = await filterFor('feedItem', 'feed-items', feedItemId);
      payload.feedItem = feedItemId;
    }

    const existingRes = await fetch(getStrapiUrl(`/api/likes?${targetFilter}`), {
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
     * empty heart, presses "like", and the record is removed. Callers that
     * know what they want should say so.
     */
    if (typeof desired === 'boolean') {
      if (desired && existingList.length === 0) {
        await fetch(getStrapiUrl('/api/likes'), {
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
        await fetch(getStrapiUrl(`/api/likes/${recordId}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` },
        });
      }
      return NextResponse.json({ liked: desired });
    }

    if (existingList.length > 0) {
      // Toggle OFF (Delete like)
      // documentId first. Strapi 5 addresses documents by documentId; handed a
        // numeric id it answers 200 and deletes nothing, so `id || documentId`
        // read like a fallback while never reaching the second operand — the
        // heart went empty and the record stayed.
        const recordId = existingList[0].documentId || existingList[0].id;
      await fetch(getStrapiUrl(`/api/likes/${recordId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
        },
      });
      return NextResponse.json({ liked: false });
    } else {
      // Toggle ON (Create like)
      await fetch(getStrapiUrl('/api/likes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify({ data: payload }),
      });
      return NextResponse.json({ liked: true });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('POST /api/likes error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

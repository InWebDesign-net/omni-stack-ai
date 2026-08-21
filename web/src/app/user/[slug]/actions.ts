import { getCurrentUserFromCookies } from '@/lib/auth-server';
import { AVATAR_PLACEHOLDER, resolveAvatarUrl } from '@/lib/avatar';

export interface UserProfile {
  id: number;
  documentId: string;
  username: string;
  handle?: string;
  avatarUrl?: string;
  bio?: string;
  subscribersCount?: number;
  allowDirectMessages?: 'everyone' | 'subscribers_only' | 'nobody';
  createdAt?: string;
}

export interface ProfileStats {
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
}

export interface ProfileCounts {
  videos: number;
  images: number;
  articles: number;
  favorites: number;
}

export interface ProfileData {
  profile: UserProfile;
  isOwner: boolean;
  /**
   * Favourites are still loaded here: they join four content types through
   * `/api/favorites`, which the filtered services do not cover. Paginating that
   * tab needs its own endpoint.
   */
  favorites: any[];
  /** Tab badges, so a label is right before its list is fetched. */
  counts: ProfileCounts;
  stats: ProfileStats;
}

/**
 * Counts and aggregate stats for one content kind, without loading the list.
 *
 * The profile used to fetch up to 200 full documents per kind just to show a
 * tab badge and sum two numbers. This asks for the two fields the sums need and
 * pages through, so the totals stay correct past any single page. The lists
 * themselves are loaded by the tab that is actually open.
 */
async function summariseKind(
  strapiUrl: string,
  headers: Record<string, string>,
  plural: string,
  creatorParam: string,
  visibilityParam: string
): Promise<{ total: number; views: number; likes: number }> {
  const PAGE = 500;
  const seen = new Set<string>();
  let views = 0;
  let likes = 0;
  let page = 1;
  let pageCount = 1;

  try {
    do {
      const url =
        `${strapiUrl}/api/${plural}?locale=*&fields[0]=viewsCount&fields[1]=likesCount` +
        `&pagination[page]=${page}&pagination[pageSize]=${PAGE}${creatorParam}${visibilityParam}`;
      const res = await fetch(url, { headers, cache: 'no-store' });
      if (!res.ok) break;
      const json = await res.json();
      for (const row of json?.data || []) {
        // `locale=*` returns one row per localization; the counters live on the
        // document, so each one must only be added once.
        const key = String(row.documentId || row.id);
        if (seen.has(key)) continue;
        seen.add(key);
        views += Number(row.viewsCount || 0);
        likes += Number(row.likesCount || 0);
      }
      pageCount = Number(json?.meta?.pagination?.pageCount || 1);
      page += 1;
    } while (page <= pageCount);
  } catch (e) {
    console.error(`Error summarising ${plural} for profile:`, e);
  }

  return { total: seen.size, views, likes };
}

export async function getProfileData(slug: string): Promise<ProfileData | null> {
  if (!slug) return null;

  try {
    const rawSlug = decodeURIComponent(slug).replace(/^@/, '').trim();
    const { user: viewer, jwt } = await getCurrentUserFromCookies();
    const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    // Server-side reads use the API token so public data (incl. the
    // creator relation and other users' profiles) is always visible,
    // independent of the viewer's role. The user JWT is only needed for
    // user-specific writes, not for reading profile/video data.
    if (process.env.STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
    }
    if (viewer?.id) {
      headers['x-omni-user-id'] = String(viewer.id);
    }

    // 1. Resolve the target user profile by its unique handle (server-side, public)
    const handleRes = await fetch(
      `${strapiUrl}/api/feed/user-by-handle?handle=${encodeURIComponent(rawSlug)}`,
      { headers, cache: 'no-store' }
    );

    let targetProfile: any = null;
    if (handleRes.ok) {
      const handleData = await handleRes.json();
      targetProfile = handleData?.data || null;
    }

    if (!targetProfile) {
      return null;
    }

    // 3. Determine ownership
    const isOwner = Boolean(
      viewer &&
        targetProfile &&
        (
          (viewer.id != null && targetProfile.id != null && String(viewer.id) === String(targetProfile.id)) ||
          ((viewer as any).documentId && targetProfile.documentId && String((viewer as any).documentId) === String(targetProfile.documentId)) ||
          (viewer.handle && targetProfile.handle && String(viewer.handle).replace(/^@/, '').toLowerCase() === String(targetProfile.handle).replace(/^@/, '').toLowerCase()) ||
          (viewer.username && targetProfile.username && String(viewer.username).toLowerCase() === String(targetProfile.username).toLowerCase())
        )
    );

    // The lists themselves are loaded by whichever tab is open, through
    // /api/content/{kind}/list — see useProfileTabList. Here we only need what
    // the header and the tab badges show, which is counts and two sums.
    const creatorParam = targetProfile?.id
      ? `&filters[creator][id][$eq]=${targetProfile.id}`
      : (targetProfile?.documentId ? `&filters[creator][documentId][$eq]=${encodeURIComponent(targetProfile.documentId)}` : '');
    const visibilityParam = isOwner ? '' : '&filters[visibility][$eq]=public';

    const [videoSummary, imageSummary, articleSummary] = await Promise.all([
      summariseKind(strapiUrl, headers, 'videos', creatorParam, visibilityParam),
      summariseKind(strapiUrl, headers, 'images', creatorParam, visibilityParam),
      summariseKind(strapiUrl, headers, 'articles', creatorParam, visibilityParam),
    ]);

    const totalViews = videoSummary.views + imageSummary.views + articleSummary.views;
    const totalLikes = videoSummary.likes + imageSummary.likes + articleSummary.likes;

    // 8. Fetch Favorites for this profile
    let favorites: any[] = [];
    try {
      const handleFilter = encodeURIComponent(targetProfile.handle || targetProfile.username || '');
      const userFavUrl = `${strapiUrl}/api/favorites?filters[$or][0][user][id][$eq]=${targetProfile.id}&filters[$or][1][userIdentifier][$eq]=${handleFilter}&filters[$or][2][userIdentifier][$eq]=user-${targetProfile.id}&populate=video,image,feedItem,article&pagination[pageSize]=50`;
      const favRes = await fetch(userFavUrl, { headers, cache: 'no-store' });
      if (favRes.ok) {
        const favData = await favRes.json();
        const rawFavs = favData?.data || [];
        for (const f of rawFavs) {
          if (f.video) {
            favorites.push({ ...f.video, mediaType: 'video' });
          } else if (f.image) {
            favorites.push({
              documentId: f.image.documentId,
              slug: f.image.slug,
              title: f.image.title,
              thumbnailUrl: f.image.thumbnailUrl || f.image.imageUrl,
              summary: f.image.summary,
              viewsCount: f.image.viewsCount || 0,
              likesCount: f.image.likesCount || 0,
              mediaType: 'image',
            });
          } else if (f.article) {
            favorites.push({
              documentId: f.article.documentId,
              slug: f.article.slug,
              title: f.article.title,
              thumbnailUrl: f.article.thumbnail || f.article.thumbnailUrl,
              summary: f.article.summary,
              viewsCount: f.article.viewsCount || 0,
              likesCount: f.article.likesCount || 0,
              mediaType: 'article',
            });
          } else if (f.feedItem) {
            const fi = f.feedItem;
            favorites.push({
              documentId: fi.documentId,
              slug: fi.slug,
              title: fi.title,
              thumbnailUrl: fi.thumbnailUrl,
              summary: fi.summary,
              viewsCount: fi.viewsCount || 0,
              likesCount: fi.likesCount || 0,
              mediaType: 'content',
            });
          }
        }
      }
    } catch (e) {
      console.error('Error fetching favorites for profile:', e);
    }

    return {
      profile: {
        id: targetProfile.id,
        documentId: targetProfile.documentId || String(targetProfile.id),
        username: targetProfile.username || 'User Profile',
        handle: targetProfile.handle || `@user${targetProfile.id}`,
        avatarUrl: resolveAvatarUrl(targetProfile.avatarUrl),
        bio: targetProfile.bio || 'Content Creator on Omni Media Network.',
        subscribersCount: targetProfile.subscribersCount || 0,
        createdAt: targetProfile.createdAt,
      },
      isOwner,
      favorites,
      counts: {
        videos: videoSummary.total,
        images: imageSummary.total,
        articles: articleSummary.total,
        favorites: favorites.length,
      },
      stats: {
        totalVideos: videoSummary.total,
        totalViews,
        totalLikes,
      },
    };
  } catch (error) {
    console.error('Error in getProfileData server action:', error);
    return null;
  }
}

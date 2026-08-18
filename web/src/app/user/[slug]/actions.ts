import { getCurrentUserFromCookies } from '@/lib/auth-server';

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

export interface ProfileData {
  profile: UserProfile;
  isOwner: boolean;
  videos: any[];
  images: any[];
  articles: any[];
  favorites: any[];
  stats: ProfileStats;
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

    // 4. Fetch videos created by targetProfile (owner gets public + private, visitor gets public only)
    const creatorParam = targetProfile?.id
      ? `&filters[creator][id][$eq]=${targetProfile.id}`
      : (targetProfile?.documentId ? `&filters[creator][documentId][$eq]=${encodeURIComponent(targetProfile.documentId)}` : '');
    const visibilityParam = isOwner ? '' : '&filters[visibility][$eq]=public';

    const videosRes = await fetch(
      `${strapiUrl}/api/videos?populate=creator&pagination[pageSize]=200&locale=*${creatorParam}${visibilityParam}`,
      { headers, cache: 'no-store' }
    );

    if (!videosRes.ok) {
      console.error('Failed to fetch videos for profile');
      return null;
    }

    const videosData = await videosRes.json();
    const allVideos = videosData?.data || [];

    // 5. Filter & deduplicate videos for this profile
    const profileVideoMap = new Map<string, any>();
    for (const v of allVideos) {
      const creator = v.creator || v.author;
      const belongsToProfile = Boolean(
        creator &&
          targetProfile &&
          (
            (creator.id != null && targetProfile.id != null && String(creator.id) === String(targetProfile.id)) ||
            (creator.documentId && targetProfile.documentId && String(creator.documentId) === String(targetProfile.documentId)) ||
            (creator.handle && targetProfile.handle && String(creator.handle).replace(/^@/, '').toLowerCase() === String(targetProfile.handle).replace(/^@/, '').toLowerCase()) ||
            (creator.username && targetProfile.username && String(creator.username).toLowerCase() === String(targetProfile.username).toLowerCase())
          )
      );

      if (belongsToProfile) {
        const key = v.slug || v.documentId || v.id;
        // If owner: see all videos (public, unlisted, private). If visitor: see only public videos.
        const canView = isOwner || v.visibility === 'public';
        if (canView) {
          if (!profileVideoMap.has(key)) {
            profileVideoMap.set(key, v);
          } else if (!profileVideoMap.get(key).creator && v.creator) {
            profileVideoMap.set(key, v);
          }
        }
      }
    }
    const userVideos = Array.from(profileVideoMap.values());

    // Sort videos: if owner, private/unpublished videos FIRST, followed by creation date (newest first)
    userVideos.sort((a: any, b: any) => {
      if (isOwner) {
        const aPrivate = a.visibility === 'private' ? 1 : 0;
        const bPrivate = b.visibility === 'private' ? 1 : 0;
        if (aPrivate !== bPrivate) {
          return bPrivate - aPrivate; // Private videos first
        }
      }
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime; // Newest first
    });

    // 5. Fetch images created by targetProfile
    let userImages: any[] = [];
    try {
      const imagesRes = await fetch(
        `${strapiUrl}/api/images?populate=creator&pagination[pageSize]=200&locale=*${creatorParam}${visibilityParam}`,
        { headers, cache: 'no-store' }
      );
      if (imagesRes.ok) {
        const imagesData = await imagesRes.json();
        const allImages = imagesData?.data || [];
        const profileImageMap = new Map<string, any>();
        for (const img of allImages) {
          const creator = img.creator || img.author;
          const belongsToProfile = Boolean(
            creator &&
              targetProfile &&
              (
                (creator.id != null && targetProfile.id != null && String(creator.id) === String(targetProfile.id)) ||
                (creator.documentId && targetProfile.documentId && String(creator.documentId) === String(targetProfile.documentId)) ||
                (creator.handle && targetProfile.handle && String(creator.handle).replace(/^@/, '').toLowerCase() === String(targetProfile.handle).replace(/^@/, '').toLowerCase()) ||
                (creator.username && targetProfile.username && String(creator.username).toLowerCase() === String(targetProfile.username).toLowerCase())
              )
          );

          if (belongsToProfile) {
            const key = img.slug || img.documentId || img.id;
            const canView = isOwner || img.visibility === 'public';
            if (canView) {
              if (!profileImageMap.has(key)) {
                profileImageMap.set(key, img);
              }
            }
          }
        }
        userImages = Array.from(profileImageMap.values());
      }
    } catch (e) {
      console.error('Error fetching images for profile:', e);
    }

    // 6. Fetch articles created by targetProfile
    let userArticles: any[] = [];
    try {
      const articlesRes = await fetch(
        `${strapiUrl}/api/articles?populate=creator&pagination[pageSize]=200&locale=*${creatorParam}${visibilityParam}`,
        { headers, cache: 'no-store' }
      );
      if (articlesRes.ok) {
        const articlesData = await articlesRes.json();
        const allArticles = articlesData?.data || [];
        const profileArticleMap = new Map<string, any>();
        for (const art of allArticles) {
          const creator = art.creator || art.author;
          const belongsToProfile =
            Boolean(creatorParam) ||
            Boolean(
              creator &&
                targetProfile &&
                (
                  (creator.id != null && targetProfile.id != null && String(creator.id) === String(targetProfile.id)) ||
                  (creator.documentId && targetProfile.documentId && String(creator.documentId) === String(targetProfile.documentId)) ||
                  (creator.handle && targetProfile.handle && String(creator.handle).replace(/^@/, '').toLowerCase() === String(targetProfile.handle).replace(/^@/, '').toLowerCase()) ||
                  (creator.username && targetProfile.username && String(creator.username).toLowerCase() === String(targetProfile.username).toLowerCase())
                )
            );

          if (belongsToProfile) {
            const key = art.slug || art.documentId || art.id;
            const canView = isOwner || art.visibility === 'public';
            if (canView) {
              if (!profileArticleMap.has(key)) {
                profileArticleMap.set(key, art);
              }
            }
          }
        }
        userArticles = Array.from(profileArticleMap.values());
      }
    } catch (e) {
      console.error('Error fetching articles for profile:', e);
    }

    // 7. Calculate Stats
    let totalViews = 0;
    let totalLikes = 0;
    for (const v of userVideos) {
      totalViews += Number(v.viewsCount || 0);
      totalLikes += Number(v.likesCount || 0);
    }
    for (const img of userImages) {
      totalViews += Number(img.viewsCount || 0);
      totalLikes += Number(img.likesCount || 0);
    }
    for (const art of userArticles) {
      totalViews += Number(art.viewsCount || 0);
      totalLikes += Number(art.likesCount || 0);
    }

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
        avatarUrl: targetProfile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
        bio: targetProfile.bio || 'Content Creator on Omni Media Network.',
        subscribersCount: targetProfile.subscribersCount || 0,
        createdAt: targetProfile.createdAt,
      },
      isOwner,
      videos: userVideos,
      images: userImages,
      articles: userArticles,
      favorites,
      stats: {
        totalVideos: userVideos.length,
        totalViews,
        totalLikes,
      },
    };
  } catch (error) {
    console.error('Error in getProfileData server action:', error);
    return null;
  }
}

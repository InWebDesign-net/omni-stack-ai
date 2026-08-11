import { getCurrentUserFromCookies } from '@/lib/auth-server';

export interface UserProfile {
  id: number;
  documentId: string;
  username: string;
  handle?: string;
  avatarUrl?: string;
  bio?: string;
  subscribersCount?: number;
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

    // 2. Load videos to populate this profile's feed (filter by creator below)
    const videosRes = await fetch(
      `${strapiUrl}/api/videos?populate=creator&pagination[pageSize]=200&locale=*`,
      { headers, cache: 'no-store' }
    );

    if (!videosRes.ok) {
      console.error('Failed to fetch videos for profile');
      return null;
    }

    const videosData = await videosRes.json();
    const allVideos = videosData?.data || [];

    // 3. Determine ownership
    const isOwner = Boolean(
      viewer &&
        (viewer.id === targetProfile.id ||
          (viewer.handle && viewer.handle === targetProfile.handle) ||
          (viewer.username && viewer.username === targetProfile.username))
    );

    // 3. Filter videos for this profile
    const profileVideoMap = new Map<string, any>();
    for (const v of allVideos) {
      if (v.creator && (v.creator.id === targetProfile.id || v.creator.documentId === targetProfile.documentId)) {
        const key = v.slug || v.documentId || v.id;
        // If owner: see all videos. If visitor: see only public videos.
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

    // 4. Calculate Stats
    let totalViews = 0;
    let totalLikes = 0;
    for (const v of userVideos) {
      totalViews += Number(v.viewsCount || 0);
      totalLikes += Number(v.likesCount || 0);
    }

    // 5. Fetch Favorites for this profile
    let favorites: any[] = [];
    try {
      const favRes = await fetch(
        `${strapiUrl}/api/favs?filters[user][id][$eq]=${targetProfile.id}&populate=video&pagination[pageSize]=50`,
        { headers, cache: 'no-store' }
      );
      if (favRes.ok) {
        const favData = await favRes.json();
        favorites = (favData?.data || []).map((f: any) => f.video).filter(Boolean);
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

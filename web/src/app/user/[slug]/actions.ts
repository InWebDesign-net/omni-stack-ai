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
    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`;
    } else if (process.env.STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
    }

    // 1. Query candidate videos & creator users from Strapi to match profile
    const videosRes = await fetch(
      `${strapiUrl}/api/videos?populate=creator&pagination[pageSize]=200&locale=*`,
      { headers, cache: 'no-store' }
    );

    if (!videosRes.ok) {
      console.error('Failed to fetch videos for profile resolution');
      return null;
    }

    const videosData = await videosRes.json();
    const allVideos = videosData?.data || [];

    // Extract unique creators from videos
    const creatorsMap = new Map<string | number, any>();
    for (const v of allVideos) {
      if (v.creator) {
        const key = v.creator.id || v.creator.documentId;
        if (!creatorsMap.has(key)) {
          creatorsMap.set(key, v.creator);
        }
      }
    }

    const creatorsList = Array.from(creatorsMap.values());

    // Find target creator matching slug by handle, username, or ID
    const normSlug = rawSlug.toLowerCase();
    let targetProfile = creatorsList.find((c) => {
      const handle = (c.handle || '').toLowerCase().replace(/^@/, '');
      const username = (c.username || '').toLowerCase();
      const slugifiedUser = username.replace(/[^a-z0-9]+/g, '-');
      const idStr = String(c.id);
      const docId = (c.documentId || '').toLowerCase();

      return (
        handle === normSlug ||
        username === normSlug ||
        slugifiedUser === normSlug ||
        idStr === normSlug ||
        docId === normSlug
      );
    });

    // Fallback: If viewer is logged in and visiting their own profile slug/username
    if (!targetProfile && viewer) {
      const viewerHandle = (viewer.handle || '').toLowerCase().replace(/^@/, '');
      const viewerName = (viewer.username || '').toLowerCase();
      if (viewerHandle === normSlug || viewerName === normSlug || String(viewer.id) === normSlug) {
        targetProfile = viewer;
      }
    }

    if (!targetProfile) {
      return null;
    }

    // 2. Determine Ownership
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

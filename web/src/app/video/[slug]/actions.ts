import { getCurrentUserFromCookies } from '@/lib/auth-server';

export interface VideoOwnerStatus {
  isOwner: boolean;
  videoExists: boolean;
}

/**
 * Server-side check whether the currently authenticated user owns the video
 * identified by `slug`. Mirrors the ownership check in
 * web/src/app/user/[slug]/actions.ts — centralized here so video-specific
 * owner logic lives in one place.
 */
export async function getVideoOwnerStatus(slug: string): Promise<VideoOwnerStatus> {
  if (!slug) return { isOwner: false, videoExists: false };

  try {
    const { user } = await getCurrentUserFromCookies();
    if (!user) return { isOwner: false, videoExists: false };

    const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (process.env.STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
    }
    if (user?.id) {
      headers['x-omni-user-id'] = String(user.id);
    }

    const videoRes = await fetch(
      `${strapiUrl}/api/videos?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=creator&locale=*`,
      { headers, cache: 'no-store' }
    );

    if (!videoRes.ok) return { isOwner: false, videoExists: false };

    const videoData = await videoRes.json();
    const videoList = videoData?.data || [];
    if (videoList.length === 0) return { isOwner: false, videoExists: false };

    const videoWithCreator = videoList.find((v: any) => v.creator || v.author) || videoList[0];
    const creator = videoWithCreator?.creator || videoWithCreator?.author;

    const isOwner = Boolean(
      user &&
        creator &&
        (
          (user.id != null && creator.id != null && String(user.id) === String(creator.id)) ||
          ((user as any).documentId && creator.documentId && String((user as any).documentId) === String(creator.documentId)) ||
          (user.handle && creator.handle && String(user.handle).replace(/^@/, '').toLowerCase() === String(creator.handle).replace(/^@/, '').toLowerCase()) ||
          (user.username && creator.username && String(user.username).toLowerCase() === String(creator.username).toLowerCase())
        )
    );

    return { isOwner, videoExists: true };
  } catch (error) {
    console.error('Error in getVideoOwnerStatus server action:', error);
    return { isOwner: false, videoExists: false };
  }
}

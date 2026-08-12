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
    const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    // Server-side reads use the API token so the creator relation is always
    // visible regardless of the viewer's role.
    if (process.env.STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
    }

    const videoRes = await fetch(
      `${strapiUrl}/api/videos?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=creator`,
      { headers, cache: 'no-store' }
    );

    if (!videoRes.ok) return { isOwner: false, videoExists: false };

    const videoData = await videoRes.json();
    const videoList = videoData?.data || [];
    if (videoList.length === 0) return { isOwner: false, videoExists: false };

    const video = videoList.find((v: any) => v.creator) || videoList[0];
    const isOwner = Boolean(
      user && (user.id === video.creator?.id)
    );

    return { isOwner, videoExists: true };
  } catch (error) {
    console.error('Error in getVideoOwnerStatus server action:', error);
    return { isOwner: false, videoExists: false };
  }
}

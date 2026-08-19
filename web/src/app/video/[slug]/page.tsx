import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import VideoPageClient from '@/app/video/[slug]/VideoPageClient';
import { safeJsonLd } from '@/lib/jsonLd';
import { getCurrentUserFromCookies } from '@/lib/auth-server';
import { getVideoOwnerStatus } from '@/app/video/[slug]/actions';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

function formatIsoDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return 'PT0S';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  let res = 'PT';
  if (hours > 0) res += `${hours}H`;
  if (minutes > 0) res += `${minutes}M`;
  if (secs > 0 || (hours === 0 && minutes === 0)) res += `${secs}S`;
  return res;
}

async function getData(slug: string, jwt?: string | null, lang: string = 'de', statusParam?: string) {
  try {
    const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (process.env.STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
    }
    const { user } = await getCurrentUserFromCookies();
    if (user?.id) {
      headers['x-omni-user-id'] = String(user.id);
    }

    const statusQuery = statusParam === 'draft' ? '&status=draft' : '';

    // Fetch primary video by slug from Strapi (all localizations)
    let videoRes = await fetch(
      `${strapiUrl}/api/videos?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=creator&locale=*${statusQuery}`,
      { headers, cache: 'no-store' }
    );

    if (!videoRes.ok && statusParam === 'draft') {
      videoRes = await fetch(
        `${strapiUrl}/api/videos?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=creator&locale=*`,
        { headers, cache: 'no-store' }
      );
    }

    if (!videoRes.ok) return null;

    const videoData = await videoRes.json();
    const videoList = videoData?.data || [];
    if (videoList.length === 0) return null;

    // Pick the requested localization for server-side metadata/SEO
    const video = videoList.find((v: any) => v.locale === lang) || videoList[0];

    // Fetch related videos for sidebar
    const relatedRes = await fetch(
      `${strapiUrl}/api/videos?filters[slug][$ne]=${encodeURIComponent(slug)}&filters[visibility][$eq]=public&populate=creator&pagination[pageSize]=6&sort=createdAt:desc&locale=${lang}`,
      { headers, cache: 'no-store' }
    );

    let relatedVideos = [];
    if (relatedRes.ok) {
      const relatedData = await relatedRes.json();
      relatedVideos = relatedData?.data || [];
    }

    return {
      videoList,
      video,
      relatedVideos,
    };
  } catch (error) {
    console.error('Error fetching video server-side:', error);
    return null;
  }
}

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const searchParamsObj = searchParams ? await searchParams : {};
  const statusParam = typeof searchParamsObj.status === 'string' ? searchParamsObj.status : undefined;
  const { user, jwt } = await getCurrentUserFromCookies();
  const lang = (await cookies()).get('omni_lang')?.value === 'en' ? 'en' : 'de';
  const data = await getData(slug, jwt, lang, statusParam);

  if (!data || !data.video) {
    return {
      title: 'Video nicht gefunden | Omni Network',
      description: 'Das angeforderte Video ist auf Omni nicht verfügbar.',
    };
  }

  const video = data.video;
  const { isOwner } = await getVideoOwnerStatus(slug);

  // If video is private and user is not owner, return non-indexed notFound title
  if (video.visibility === 'private' && !isOwner && statusParam !== 'draft') {
    return {
      title: 'Privates Video | Omni Network',
      robots: { index: false, follow: false },
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';
  const url = `${baseUrl}/video/${slug}`;
  const description =
    video.summary || video.description || `Schaue "${video.title}" auf Omni BY INWEBDESIGN.`;

  const rawOgImage = video.ogImageUrl || video.thumbnailUrl || '/media/og/default.jpg';
  const ogImageUrl = rawOgImage.startsWith('http')
    ? rawOgImage
    : `${baseUrl}${rawOgImage}`;

  const thumbnailUrl = video.thumbnailUrl?.startsWith('http')
    ? video.thumbnailUrl
    : `${baseUrl}${video.thumbnailUrl || '/media/thumbnails/default.png'}`;

  const tags = Array.isArray(video.tags)
    ? video.tags.join(', ')
    : typeof video.tags === 'string'
    ? video.tags
    : 'Omni, Video, Media Network, InWebDesign';

  return {
    title: `${video.title}${video.visibility === 'private' ? ' (Vorschau/Privat)' : ''} | Omni Network`,
    description,
    keywords: tags,
    robots: video.visibility === 'private' ? { index: false, follow: false } : undefined,
    openGraph: {
      title: video.title,
      description,
      url,
      siteName: 'Omni BY INWEBDESIGN',
      type: 'video.other',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: video.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: video.title,
      description,
      images: [ogImageUrl],
    },
    alternates: { canonical: url },
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const searchParamsObj = searchParams ? await searchParams : {};
  const statusParam = typeof searchParamsObj.status === 'string' ? searchParamsObj.status : undefined;
  const { user, jwt } = await getCurrentUserFromCookies();
  const lang = (await cookies()).get('omni_lang')?.value === 'en' ? 'en' : 'de';
  const data = await getData(slug, jwt, lang, statusParam);

  if (!data || !data.video) {
    notFound();
  }

  const video = data.video;
  const { isOwner } = await getVideoOwnerStatus(slug);

  // Security & Privacy Check: If private and not owner and not in draft preview mode, return 404
  if (video.visibility === 'private' && !isOwner && statusParam !== 'draft') {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';
  const videoUrl = `${baseUrl}/video/${slug}`;
  const thumbnailUrl = video.thumbnailUrl?.startsWith('http')
    ? video.thumbnailUrl
    : `${baseUrl}${video.thumbnailUrl || '/media/thumbnails/default.png'}`;

  const mp4ContentUrl = video.mp4Url?.startsWith('http')
    ? video.mp4Url
    : `${baseUrl}${video.mp4Url || ''}`;

  const description =
    video.summary || video.description || `Schaue "${video.title}" auf Omni BY INWEBDESIGN.`;
  const isoDuration = formatIsoDuration(video.duration);

  const jsonLdVideo =
    video.visibility !== 'private'
      ? {
          '@context': 'https://schema.org',
          '@type': 'VideoObject',
          name: video.title,
          description: description,
          duration: isoDuration,
          thumbnailUrl: [thumbnailUrl],
          uploadDate: video.createdAt || new Date().toISOString(),
          contentUrl: mp4ContentUrl,
          embedUrl: videoUrl,
          isAccessibleForFree: 'True',
          author: {
            '@type': 'Person',
            name: video.creator?.username || video.creator?.handle || 'Omni Creator',
          },
        }
      : null;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Videos',
        item: `${baseUrl}/videos`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: video.title,
        item: videoUrl,
      },
    ],
  };

  const accessStatus = {
    isAccessible: true,
    isOwner,
    isPrivate: video.visibility === 'private',
  };

  return (
    <>
      {jsonLdVideo && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdVideo) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <VideoPageClient
        initialVideo={data.videoList}
        initialRelated={data.relatedVideos}
        slug={slug}
        initialLang={lang}
        accessStatus={accessStatus}
      />
    </>
  );
}
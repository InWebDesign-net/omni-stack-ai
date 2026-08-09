import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import VideoPageClient from '@/app/video/[slug]/VideoPageClient';

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

async function getData(slug: string) {
  try {
    const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
    const token = process.env.STRAPI_API_TOKEN;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Fetch primary video by slug from Strapi
    const videoRes = await fetch(
      `${strapiUrl}/api/videos?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=creator&locale=de`,
      { headers, cache: 'no-store' }
    );

    if (!videoRes.ok) return null;

    const videoData = await videoRes.json();
    const videoList = videoData?.data || [];
    if (videoList.length === 0) return null;

    const video = videoList[0];

    // Fetch related videos for sidebar
    const relatedRes = await fetch(
      `${strapiUrl}/api/videos?filters[slug][$ne]=${encodeURIComponent(slug)}&filters[visibility][$eq]=public&populate=creator&pagination[pageSize]=6&sort=createdAt:desc`,
      { headers, cache: 'no-store' }
    );

    let relatedVideos = [];
    if (relatedRes.ok) {
      const relatedData = await relatedRes.json();
      relatedVideos = relatedData?.data || [];
    }

    return {
      video,
      relatedVideos,
      accessStatus: { isAccessible: true },
    };
  } catch (error) {
    console.error('Error fetching video server-side:', error);
    return null;
  }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const data = await getData(slug);

  if (!data || !data.video) {
    return {
      title: 'Video nicht gefunden | Omni Network',
      description: 'Das angeforderte Video ist auf Omni nicht verfügbar.',
    };
  }

  const video = data.video;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';
  const url = `${baseUrl}/video/${slug}`;
  const description =
    video.summary || video.description || `Schaue "${video.title}" auf Omni BY INWEBDESIGN.`;

  const thumbnailUrl = video.thumbnailUrl?.startsWith('http')
    ? video.thumbnailUrl
    : `${baseUrl}${video.thumbnailUrl || '/media/thumbnails/default.png'}`;

  const tags = Array.isArray(video.tags)
    ? video.tags.join(', ')
    : typeof video.tags === 'string'
    ? video.tags
    : 'Omni, Video, Media Network, InWebDesign';

  return {
    title: `${video.title} | Omni Network`,
    description,
    keywords: tags,
    openGraph: {
      title: video.title,
      description,
      url,
      siteName: 'Omni BY INWEBDESIGN',
      type: 'video.other',
      images: [
        {
          url: thumbnailUrl,
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
      images: [thumbnailUrl],
    },
    alternates: { canonical: url },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const data = await getData(slug);

  if (!data || !data.video) {
    notFound();
  }

  const video = data.video;
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

  const jsonLdVideo = {
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
  };

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdVideo) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <VideoPageClient
        initialVideo={video}
        initialRelated={data.relatedVideos}
        slug={slug}
      />
    </>
  );
}
import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import ContentPageClient from './ContentPageClient';
import { safeJsonLd } from '@/lib/jsonLd';
import { getCurrentUserFromCookies } from '@/lib/auth-server';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getData(slug: string, jwt?: string | null) {
  try {
    const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (process.env.STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
    }

    const itemRes = await fetch(
      `${strapiUrl}/api/feed-items?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=author,blocks`,
      { headers, cache: 'no-store' }
    );

    if (!itemRes.ok) return null;

    const itemData = await itemRes.json();
    const itemList = itemData?.data || [];
    if (itemList.length === 0) return null;

    const item = itemList.find((v: any) => v.author) || itemList[0];

    const relatedRes = await fetch(
      `${strapiUrl}/api/feed-items?filters[slug][$ne]=${encodeURIComponent(slug)}&filters[visibility][$eq]=public&populate=author&pagination[pageSize]=6&sort=publishedAt:desc`,
      { headers, cache: 'no-store' }
    );

    let relatedItems = [];
    if (relatedRes.ok) {
      const relatedData = await relatedRes.json();
      relatedItems = relatedData?.data || [];
    }

    return {
      item,
      relatedItems,
    };
  } catch (error) {
    console.error('Error fetching content server-side:', error);
    return null;
  }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const { user, jwt } = await getCurrentUserFromCookies();
  const data = await getData(slug, jwt);

  if (!data || !data.item) {
    return {
      title: 'Content nicht gefunden | Omni Network',
      description: 'Der angeforderte Inhalt ist auf Omni nicht verfügbar.',
    };
  }

  const item = data.item;
  const isOwner = Boolean(user?.id && item.author?.id === user.id);

  if (item.visibility === 'private' && !isOwner) {
    return {
      title: 'Privater Content | Omni Network',
      robots: { index: false, follow: false },
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';
  const url = `${baseUrl}/content/${slug}`;
  const description =
    item.summary || `Lies "${item.title}" auf Omni BY INWEBDESIGN.`;

  const thumbnailUrl = item.thumbnailUrl?.startsWith('http')
    ? item.thumbnailUrl
    : `${baseUrl}${item.thumbnailUrl || '/media/thumbnails/default.png'}`;

  const tags = Array.isArray(item.tags)
    ? item.tags.join(', ')
    : typeof item.tags === 'string'
    ? item.tags
    : 'Omni, Content, Media Network, InWebDesign';

  return {
    title: `${item.title}${item.visibility === 'private' ? ' (Vorschau/Privat)' : ''} | Omni Network`,
    description,
    keywords: tags,
    robots: item.visibility === 'private' ? { index: false, follow: false } : undefined,
    openGraph: {
      title: item.title,
      description,
      url,
      siteName: 'Omni BY INWEBDESIGN',
      type: 'article',
      images: [
        {
          url: thumbnailUrl,
          width: 1200,
          height: 630,
          alt: item.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: item.title,
      description,
      images: [thumbnailUrl],
    },
    alternates: { canonical: url },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const { user, jwt } = await getCurrentUserFromCookies();
  const data = await getData(slug, jwt);

  if (!data || !data.item) {
    notFound();
  }

  const item = data.item;
  const isOwner = Boolean(user?.id && item.author?.id === user.id);

  if (item.visibility === 'private' && !isOwner) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';
  const itemUrl = `${baseUrl}/content/${slug}`;
  const thumbnailUrl = item.thumbnailUrl?.startsWith('http')
    ? item.thumbnailUrl
    : `${baseUrl}${item.thumbnailUrl || '/media/thumbnails/default.png'}`;

  const description =
    item.summary || `Lies "${item.title}" auf Omni BY INWEBDESIGN.`;

  const jsonLdArticle =
    item.visibility !== 'private'
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: item.title,
          description: description,
          image: [thumbnailUrl],
          datePublished: item.publishedAt || item.createdAt || new Date().toISOString(),
          dateModified: item.updatedAt || new Date().toISOString(),
          author: {
            '@type': 'Person',
            name: item.author?.username || item.author?.handle || 'Omni Creator',
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
        name: 'Content',
        item: `${baseUrl}/content`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: item.title,
        item: itemUrl,
      },
    ],
  };

  const accessStatus = {
    isAccessible: true,
    isOwner,
    isPrivate: item.visibility === 'private',
  };

  return (
    <>
      {jsonLdArticle && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdArticle) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <ContentPageClient
        initialItem={item}
        initialRelated={data.relatedItems}
        slug={slug}
        accessStatus={accessStatus}
      />
    </>
  );
}

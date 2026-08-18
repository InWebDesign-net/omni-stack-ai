import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies, headers as nextHeaders } from 'next/headers';
import ArticleDetailPageClient from './ArticleDetailPageClient';
import { safeJsonLd } from '@/lib/jsonLd';
import { getCurrentUserFromCookies } from '@/lib/auth-server';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getArticleData(slug: string, lang: string = 'de') {
  try {
    const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (process.env.STRAPI_API_TOKEN) {
      reqHeaders['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
    }

    const { user } = await getCurrentUserFromCookies();
    if (user?.id) {
      reqHeaders['x-omni-user-id'] = String(user.id);
    }

    // Try custom filtered endpoint first
    let res = await fetch(
      `${strapiUrl}/api/articles/filtered?q=${encodeURIComponent(slug)}&lang=*&includeProcessing=true`,
      { headers: reqHeaders, cache: 'no-store' }
    );

    let items = [];
    if (res.ok) {
      const data = await res.json();
      items = data.data || [];
    }

    // Fallback to standard articles query if filtered returned no items
    if (!items || items.length === 0) {
      res = await fetch(
        `${strapiUrl}/api/articles?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=creator,blocks&locale=*`,
        { headers: reqHeaders, cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        items = data.data || [];
      }
    }

    if (!items || items.length === 0) return null;

    // Filter items specifically matching slug
    const matchingItems = items.filter((it: any) => (it.attributes?.slug || it.slug) === slug);
    const finalItems = matchingItems.length > 0 ? matchingItems : items;

    const initialItem = finalItems.find((it: any) => (it.attributes?.locale || it.locale) === lang) || finalItems[0];
    const itemData = initialItem?.attributes || initialItem;

    return {
      itemList: finalItems.map((it: any) => it.attributes || it),
      item: itemData,
    };
  } catch (error) {
    console.error('Failed to fetch article server-side:', error);
    return null;
  }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const cookieStore = await cookies();
  const lang = cookieStore.get('omni_lang')?.value === 'en' ? 'en' : 'de';
  const data = await getArticleData(slug, lang);

  if (!data || !data.item) {
    return {
      title: 'Artikel nicht gefunden | Omni Network',
      description: 'Der angeforderte Artikel ist auf Omni nicht verfügbar.',
    };
  }

  const item = data.item;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';
  const url = `${baseUrl}/article/${slug}`;
  const description =
    typeof item.summary === 'string'
      ? item.summary
      : `${item.title} - Lesen auf Omni Network.`;

  const ogImageUrl = item.thumbnail?.startsWith('http')
    ? item.thumbnail
    : `${baseUrl}${item.thumbnail || '/media/og/default.jpg'}`;

  return {
    title: `${item.title} | Omni Articles`,
    description,
    openGraph: {
      title: item.title,
      description,
      url,
      siteName: 'Omni BY INWEBDESIGN',
      type: 'article',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: item.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: item.title,
      description,
      images: [ogImageUrl],
    },
    alternates: { canonical: url },
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const lang = cookieStore.get('omni_lang')?.value === 'en' ? 'en' : 'de';
  const data = await getArticleData(slug, lang);

  if (!data || !data.item) {
    notFound();
  }

  const item = data.item;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';
  const articleUrl = `${baseUrl}/article/${slug}`;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Articles', item: `${baseUrl}/articles` },
      { '@type': 'ListItem', position: 3, name: item.title, item: articleUrl },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <ArticleDetailPageClient initialItem={data.itemList} slug={slug} />
    </>
  );
}

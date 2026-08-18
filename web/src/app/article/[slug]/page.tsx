import { notFound } from 'next/navigation';
import { getDictionary } from '@/lib/i18n';
import { headers } from 'next/headers';
import ArticleDetailPageClient from './ArticleDetailPageClient';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const headersList = await headers();
  const lang = headersList.get('x-lang') || 'de';
  const t = getDictionary(lang);

  return {
    title: `${slug} | Omni Articles`,
    description: t.articles?.subtitle || 'Entdecke Geschichten, Analysen und Wissen aus dem Omni Network.',
  };
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  try {
    const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
    const res = await fetch(
      `${strapiUrl}/api/articles?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=creator,blocks&locale=*`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      notFound();
      return null;
    }

    const data = await res.json();
    const items = data.data || [];
    
    if (items.length === 0) {
      notFound();
      return null;
    }

    const initialItem = items[0]?.attributes || items[0];

    return <ArticleDetailPageClient initialItem={initialItem} slug={slug} />;
  } catch (error) {
    console.error('Failed to load article:', error);
    notFound();
    return null;
  }
}

import ArticlesPageClient from './ArticlesPageClient';
import { resolveLang } from '@/lib/locale-server';
import { localizePath, languageAlternates } from '@/lib/locale';

export const dynamic = 'force-dynamic';

/**
 * This page had no metadata at all, so it inherited the root layout's — which
 * declared the home page as its canonical. It was telling search engines it
 * was a copy of the front page.
 */
export async function generateMetadata() {
  const lang = await resolveLang();
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';
  return {
    title: lang === 'en' ? 'Articles | Omni Network' : 'Artikel | Omni Network',
    description:
      lang === 'en'
        ? 'Read articles by the creators of the Omni media network.'
        : 'Lies Artikel der Kanäle im Omni Mediennetzwerk.',
    alternates: {
      canonical: `${baseUrl}${localizePath('/articles', lang)}`,
      languages: languageAlternates(baseUrl, '/articles'),
    },
  };
}

export default function ArticlesPage() {
  return <ArticlesPageClient />;
}

import { Metadata } from 'next';
import { resolveLang } from '@/lib/locale-server';
import { localizePath, languageAlternates } from '@/lib/locale';
import ShortsFeedPage from '../page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lang = await resolveLang();
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';
  /*
   * The vertical view of a video is the same video, so it keeps pointing at the
   * detail page — but at the detail page in the reader's language. Pointing a
   * German page at an English canonical would ask a crawler to index the wrong
   * one of the two.
   */
  return {
    title: `${slug} | Omni Shorts`,
    alternates: {
      canonical: `${baseUrl}${localizePath(`/video/${slug}`, lang)}`,
      languages: languageAlternates(baseUrl, `/video/${slug}`),
    },
  };
}

export default function ShortItemPage() {
  return <ShortsFeedPage />;
}

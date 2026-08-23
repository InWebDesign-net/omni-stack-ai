import { Metadata } from 'next';
import { resolveLang } from '@/lib/locale-server';
import { localizePath, languageAlternates } from '@/lib/locale';
import HomeClient from './HomeClient';

const baseMetadata: Metadata = {
  title: 'Omni – Hyper-Personalisiertes KI Mediennetzwerk',
  description: 'Entdecke hyper-personalisierte Videos, Kanäle und Inhalte powered by Omni AI & Level 4 HLS Security.',
  openGraph: {
    title: 'Omni – Hyper-Personalisiertes KI Mediennetzwerk',
    description: 'Entdecke hyper-personalisierte Videos, Kanäle und Inhalte powered by Omni AI & Level 4 HLS Security.',
    url: 'https://omni-web.inwebdesign.net',
    siteName: 'Omni Network',
    images: [
      {
        url: 'https://omni-web.inwebdesign.net/og_image.jpg',
        width: 1200,
        height: 630,
        alt: 'Omni Media Network Preview',
      },
    ],
    locale: 'de_DE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Omni – Hyper-Personalisiertes KI Mediennetzwerk',
    description: 'Entdecke hyper-personalisierte Videos, Kanäle und Inhalte powered by Omni AI & Level 4 HLS Security.',
    images: ['https://omni-web.inwebdesign.net/og_image.jpg'],
  },
};

/**
 * The home page names its own address in the reader's language.
 *
 * It used to inherit a canonical from the root layout, which every other page
 * inherited too — see the note there.
 */
export async function generateMetadata(): Promise<Metadata> {
  const lang = await resolveLang();
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';
  return {
    ...baseMetadata,
    alternates: {
      canonical: `${baseUrl}${localizePath('/', lang)}`,
      languages: languageAlternates(baseUrl, '/'),
    },
  };
}

export default function HomePage() {
  return <HomeClient />;
}

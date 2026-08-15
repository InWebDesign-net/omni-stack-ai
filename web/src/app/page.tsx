import { Metadata } from 'next';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
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

export default function HomePage() {
  return <HomeClient />;
}

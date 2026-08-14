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
        url: 'https://omni-web.inwebdesign.net/android-chrome-192x192.png',
        width: 192,
        height: 192,
        alt: 'Omni Logo',
      },
    ],
    locale: 'de_DE',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Omni – Hyper-Personalisiertes KI Mediennetzwerk',
    description: 'Entdecke hyper-personalisierte Videos, Kanäle und Inhalte powered by Omni AI & Level 4 HLS Security.',
    images: ['https://omni-web.inwebdesign.net/android-chrome-192x192.png'],
  },
};

export default function HomePage() {
  return <HomeClient />;
}

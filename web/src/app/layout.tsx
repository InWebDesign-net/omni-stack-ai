import type { Metadata } from 'next';
import './globals.css';

import { safeJsonLd } from '@/lib/jsonLd';

import { SiteChrome } from '@/components/SiteChrome';

export const metadata: Metadata = {
  metadataBase: new URL('https://omni-web.inwebdesign.net'),
  title: {
    default: 'Omni - Hyper-Personalized AI Media Network | BY INWEBDESIGN',
    template: '%s | Omni Network',
  },
  description:
    'Omni ist das KI-gestützte, hyper-personalisierte Mediennetzwerk von InWebDesign. Entdecke maßgeschneiderte Videos, Dokumentationen, wissenschaftliche PDFs und Artikel in Echtzeit mit Ollama LLM Vektor-Personalisierung.',
  keywords: [
    'Omni',
    'InWebDesign',
    'KI Mediennetzwerk',
    'Hyper-Personalized Feed',
    'Ollama AI',
    'Wissenschaft PDFs',
    'Dokumentationen',
    'Tech Tutorials',
    'NextJS 15',
    'Strapi v5',
    'PostgreSQL Vector Search',
    'BY INWEBDESIGN',
  ],
  authors: [{ name: 'InWebDesign', url: 'https://inwebdesign.net' }],
  creator: 'InWebDesign',
  publisher: 'InWebDesign',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    other: [
      { rel: 'android-chrome-192x192', url: '/android-chrome-192x192.png' },
      { rel: 'android-chrome-512x512', url: '/android-chrome-512x512.png' },
    ],
  },
  alternates: {
    canonical: 'https://omni-web.inwebdesign.net',
    languages: {
      'de-DE': 'https://omni-web.inwebdesign.net?lang=de',
      'en-US': 'https://omni-web.inwebdesign.net?lang=en',
    },
  },
  openGraph: {
    title: 'Omni - Hyper-Personalized AI Media Network | BY INWEBDESIGN',
    description:
      'Next-Gen KI-gestützte Content-Plattform mit Echtzeit-Vektor-Personalisierung, Kanal-Profilen und lokaler LLM-Intents-Steuerung.',
    url: 'https://omni-web.inwebdesign.net',
    siteName: 'Omni BY INWEBDESIGN',
    locale: 'de_DE',
    type: 'website',
    images: [
      {
        url: '/og_image.jpg',
        width: 1200,
        height: 630,
        alt: 'Omni Media Network Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Omni - Hyper-Personalized AI Media Network | BY INWEBDESIGN',
    description:
      'Entdecke KI-personalisierte Videos, Artikel & PDFs in Echtzeit. Powered by InWebDesign.',
    creator: '@InWebDesign',
    images: ['/og_image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const jsonLdWebsite = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Omni BY INWEBDESIGN',
  url: 'https://omni-web.inwebdesign.net',
  description: 'Hyper-Personalized AI Media Network powered by Strapi, Next.js & Ollama AI',
  publisher: {
    '@type': 'Organization',
    name: 'InWebDesign',
    url: 'https://inwebdesign.net',
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://omni-web.inwebdesign.net/?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

const jsonLdOrganization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'InWebDesign',
  url: 'https://inwebdesign.net',
  logo: 'https://omni-web.inwebdesign.net/icon.png',
  sameAs: ['https://inwebdesign.net'],
};

import { AppProvider } from '@/context/AppContext';
import { ChatProvider } from '@/context/ChatContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { UploadProvider } from '@/context/UploadContext';
import ChatWidget from '@/components/chat/ChatWidget';
import GlobalUploadManager from '@/components/GlobalUploadManager';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark bg-base" suppressHydrationWarning data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdWebsite) }}
        />
        {/*
          Theme resolution is deliberately switched off: `data-theme` is pinned to
          "dark" on <html> above.

          The token layer and the light palette in globals.css are intact and
          staying — the reason light mode was unusable is that ~1000 call sites
          still hardcode `text-white`, `bg-slate-*` and raw hex values instead of
          the tokens, so every unmigrated surface turned white-on-white. That is a
          migration, not a design problem.

          Re-enabling is this script coming back plus <ThemeToggle /> in the
          header. Do that once the counts below are near zero:

            grep -rhoE '(bg|text|border)-\[#[0-9a-fA-F]{3,8}\]' web/src --include=*.tsx | wc -l
            grep -rhoE '\btext-(white|slate-(100|200|300))\b' web/src --include=*.tsx | wc -l
            grep -rhoE '\bbg-slate-[0-9]{2,3}' web/src --include=*.tsx | wc -l
        */}
      </head>
      <body className="antialiased bg-base text-primary min-h-screen flex flex-col selection:bg-[#8083ff] selection:text-white" suppressHydrationWarning>
        <AppProvider>
          <ChatProvider>
            <UploadProvider>
              <NotificationProvider>
                <div className="flex-1 flex flex-col">
                  {children}
                </div>
                <SiteChrome />
                <ChatWidget />
                <GlobalUploadManager />
              </NotificationProvider>
            </UploadProvider>
          </ChatProvider>
        </AppProvider>
      </body>
    </html>
  );
}

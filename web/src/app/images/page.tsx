import React, { Suspense } from 'react';
import { resolveLang } from '@/lib/locale-server';
import { localizePath, languageAlternates } from '@/lib/locale';
import ImagesPageClient from './ImagesPageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const lang = await resolveLang();
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';
  return {
    title: 'Omni Galerie & Bilder | Next-Gen WebP Artwork & Photography',
    description: 'Entdecke hochauflösende digitale Fotografie, 3D-Renderings & Kunstwerke im Omni Media Network.',
    alternates: {
      canonical: `${baseUrl}${localizePath('/images', lang)}`,
      languages: languageAlternates(baseUrl, '/images'),
    },
  };
}

export default async function ImagesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
        </div>
      }
    >
      <ImagesPageClient initialParams={resolvedSearchParams} />
    </Suspense>
  );
}

import React, { Suspense } from 'react';
import ImagesPageClient from './ImagesPageClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Omni Galerie & Bilder | Next-Gen WebP Artwork & Photography',
  description: 'Entdecke hochauflösende digitale Fotografie, 3D-Renderings & Kunstwerke im Omni Media Network.',
};

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

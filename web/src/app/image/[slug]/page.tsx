import React from 'react';
import { notFound } from 'next/navigation';
import ImagePageClient from './ImagePageClient';

export const dynamic = 'force-dynamic';

async function fetchImageBySlug(slug: string) {
  const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
  try {
    const res = await fetch(`${strapiUrl}/api/images/filtered?q=${slug}&pageSize=1&includeProcessing=true`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.[0] || null;
  } catch (e) {
    return null;
  }
}

async function fetchRelatedImages() {
  const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
  try {
    const res = await fetch(`${strapiUrl}/api/images/filtered?pageSize=6`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data || [];
  } catch (e) {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const image = await fetchImageBySlug(slug);

  if (!image) {
    return {
      title: 'Bild nicht gefunden | Omni Network',
    };
  }

  return {
    title: `${image.title} | Omni Galerie`,
    description: image.summary || 'Bildinhalt im Omni Network',
    openGraph: {
      title: image.title,
      description: image.summary || 'Bildinhalt im Omni Network',
      images: [image.imageUrl || image.thumbnailUrl],
    },
  };
}

export default async function ImagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const image = await fetchImageBySlug(slug);

  if (!image) {
    notFound();
  }

  const related = await fetchRelatedImages();

  return <ImagePageClient initialImage={image} initialRelated={related} slug={slug} />;
}

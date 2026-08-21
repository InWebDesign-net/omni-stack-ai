import React from 'react';
import { notFound } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth-server';
import ImagePageClient from './ImagePageClient';

export const dynamic = 'force-dynamic';

async function fetchImageBySlug(slug: string) {
  const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
  try {
    // Without the viewer, the default-deny visibility middleware hides every
    // private image — including from the person who owns it, who then gets a
    // 404 on their own upload. The video and article pages already do this.
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
    }
    const { user } = await getCurrentUserFromCookies();
    if (user?.id) {
      headers['x-omni-user-id'] = String(user.id);
    }

    const res = await fetch(`${strapiUrl}/api/images/filtered?filters[slug][$eq]=${encodeURIComponent(slug)}&pageSize=1&includeProcessing=true&locale=*`, {
      headers,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.[0] || null;
  } catch (e) {
    return null;
  }
}

async function fetchRelatedImages(excludeSlug?: string) {
  const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
  try {
    const excludeQuery = excludeSlug ? `&excludeSlug=${encodeURIComponent(excludeSlug)}` : '';
    const res = await fetch(`${strapiUrl}/api/images/filtered?pageSize=12${excludeQuery}`, {
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

  const related = await fetchRelatedImages(slug);

  return <ImagePageClient initialImage={image} initialRelated={related} slug={slug} />;
}

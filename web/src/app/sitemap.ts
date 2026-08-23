import type { MetadataRoute } from 'next';
import { languageAlternates, localizePath } from '@/lib/locale';

const BASE_URL = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';
const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

/** Listed once, in German, with the English address declared as an alternate. */
const STATIC_PATHS = ['/', '/videos', '/images', '/articles', '/shorts'];

type Row = { slug: string; updatedAt?: string };

/**
 * One entry per page, naming both languages.
 *
 * Until now there was no sitemap at all, and no robots.txt pointing at one, so
 * a crawler had to find everything by following links — which never reached the
 * English pages, because before the locale prefix they had no address to find.
 *
 * Private and unpublished items are excluded by asking through the public API
 * rather than the database: the visibility rules already live there, and a
 * sitemap is exactly the wrong place to reimplement them.
 */
async function fetchSlugs(kind: 'video' | 'image' | 'article'): Promise<Row[]> {
  try {
    const res = await fetch(
      `${STRAPI_URL}/api/${kind}s?fields[0]=slug&fields[1]=updatedAt&filters[visibility][$eq]=public&locale=de&pagination[pageSize]=500`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || [])
      .map((row: any) => ({ slug: row.slug, updatedAt: row.updatedAt }))
      .filter((row: Row) => Boolean(row.slug));
  } catch {
    // A sitemap that fails to build must not take the route down with it — an
    // incomplete sitemap costs a crawl cycle, a 500 costs the whole file.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [videos, images, articles] = await Promise.all([
    fetchSlugs('video'),
    fetchSlugs('image'),
    fetchSlugs('article'),
  ]);

  const entry = (path: string, lastModified?: string): MetadataRoute.Sitemap[number] => ({
    url: `${BASE_URL}${localizePath(path, 'de')}`,
    lastModified: lastModified ? new Date(lastModified) : new Date(),
    alternates: { languages: languageAlternates(BASE_URL, path) },
  });

  return [
    ...STATIC_PATHS.map((path) => entry(path)),
    ...videos.map((row) => entry(`/video/${row.slug}`, row.updatedAt)),
    ...images.map((row) => entry(`/image/${row.slug}`, row.updatedAt)),
    ...articles.map((row) => entry(`/article/${row.slug}`, row.updatedAt)),
  ];
}

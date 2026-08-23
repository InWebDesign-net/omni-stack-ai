import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_URL || 'https://omni-web.inwebdesign.net';

/**
 * There was no robots.txt, which is not the same as allowing everything: it
 * also meant nothing pointed a crawler at a sitemap.
 *
 * The disallowed paths are the ones that produce no page worth indexing —
 * the BFF under /api, and anything behind a session. Everything else is a
 * public boilerplate preview and is meant to be found.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}

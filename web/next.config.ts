import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@omni/shared'],
  images: {
    /**
     * Hosts the Next.js image optimizer is allowed to fetch from.
     *
     * This is not a list of hosts we happen to use — it is a list of hosts
     * anyone may ask this server to fetch on their behalf. A request to
     * `/_next/image?url=https://<host>/<anything>` makes the server download
     * that URL, optimize it, cache it and serve it from our domain. Every
     * pattern here is therefore an open proxy for whatever matches it, so the
     * list stays as narrow as the actual usage.
     *
     * Removed 2026-08-22: `images.unsplash.com`. The demo avatars and stock
     * thumbnails that needed it are served from /public/demo-media now, so the
     * site makes no third-party image requests at all — see the README there.
     *
     * Removed 2026-08-21 after checking code and database: `**.amazonaws.com`,
     * `**.cloudfront.net` and `**.strapiapp.com` had zero references anywhere.
     * They are Strapi Cloud defaults, and this deployment serves its media
     * locally from /media/. The first two in particular matched every S3 bucket
     * and CloudFront distribution on the internet.
     */

    remotePatterns: [
      // Strapi's own media library, used by content uploaded through the admin panel.
      { protocol: 'http', hostname: '127.0.0.1', port: '1337' },
      { protocol: 'http', hostname: 'localhost', port: '1337' },


      // Our own domain, for absolute URLs to assets that live there
      // (og_image.jpg, icon.png). No component loads one through the optimizer
      // today, but pointing the server at our own host carries no abuse surface.
      { protocol: 'https', hostname: '**.inwebdesign.net' },
    ],
  },
};

export default nextConfig;

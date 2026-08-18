import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@omni/shared'],
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: '127.0.0.1', port: '1337' },
      { protocol: 'http', hostname: 'localhost', port: '1337' },
      { protocol: 'https', hostname: '**.unsplash.com' },
      { protocol: 'https', hostname: '**.inwebdesign.net' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: '**.strapiapp.com' },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@omni/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.unsplash.com' },
      { protocol: 'https', hostname: '**.inwebdesign.net' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: '**.strapiapp.com' },
    ],
  },
};

export default nextConfig;

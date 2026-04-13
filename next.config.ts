import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['crawlee', '@crawlee/basic', 'got-scraping'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.icons8.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '1000logos.net',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

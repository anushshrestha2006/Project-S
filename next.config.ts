import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 👇 This enables static HTML export (needed for Firebase Hosting)
  output: "export",

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

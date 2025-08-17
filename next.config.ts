import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dasy-handout.s3.ap-northeast-2.amazonaws.com',
        port: '',
        pathname: '/problems/**',
      },
    ],
  },
};

export default nextConfig;

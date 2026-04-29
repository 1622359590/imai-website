import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:37888/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:37888/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;

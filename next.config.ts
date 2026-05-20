import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external images from common crypto / finance data sources
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.coingecko.com' },
      { protocol: 'https', hostname: 'static.coinpaprika.com' },
      { protocol: 'https', hostname: 'cryptologos.cc' },
      { protocol: 'https', hostname: 'cdn.jsdelivr.net' },
    ],
  },

  // Skip TS and ESLint errors during Vercel build (we type-check separately)
  typescript: { ignoreBuildErrors: true },
  eslint:     { ignoreDuringBuilds: true },

  // Server-side external packages (crypto libs must run on server)
  serverExternalPackages: ['tweetnacl', '@solana/web3.js'],

  // Custom headers for security + CORS on API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',            value: 'DENY' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;

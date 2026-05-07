const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained build for minimal container images.
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  // Serve runtime-uploaded files via an API route. Next.js standalone snapshots
  // the public/ file list at build time, so files written to public/uploads
  // after build are 404. The rewrite falls through to the API handler when
  // the file isn't already in the static set.
  async rewrites() {
    return [
      { source: "/uploads/:path*", destination: "/api/uploads/:path*" },
    ];
  },
  webpack: (config) => {
    // pino-pretty is an optional CLI dep pulled in by WalletConnect — not needed in browser
    config.resolve.alias = {
      ...config.resolve.alias,
      'pino-pretty': false,
      encoding: false,
    };
    return config;
  },
};

module.exports = withNextIntl(nextConfig);

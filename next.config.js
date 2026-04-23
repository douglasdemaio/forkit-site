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

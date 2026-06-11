import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Compile TypeScript sources from shared workspace packages.
  transpilePackages: ['@agri/sensor-catalog', '@agri/i18n'],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Local-dev only: proxy API calls through Next so the browser stays
  // same-origin (the prod backend only CORS-allows the www origin).
  // Enabled when PROXY_API_TARGET is set; no-op in production builds.
  async rewrites() {
    const target = process.env.PROXY_API_TARGET;
    if (!target) return [];
    return [{ source: '/api-proxy/:path*', destination: `${target}/:path*` }];
  },
};

export default withNextIntl(nextConfig);

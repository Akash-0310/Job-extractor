/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  eslint: {
    // Lint is run explicitly in CI; do not fail production builds on lint.
    ignoreDuringBuilds: false,
  },
  experimental: {
    // googleapis and other server-only deps must not be bundled for the client.
    serverComponentsExternalPackages: ['googleapis', 'google-auth-library', 'bullmq', 'ioredis', 'exceljs', 'pino'],
  },
};

module.exports = nextConfig;

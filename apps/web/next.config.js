/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pm-saas/sync-engine', '@pm-saas/shared'],
};

module.exports = nextConfig;
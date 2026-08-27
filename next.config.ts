import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  devIndicators: false,
};
export default nextConfig;

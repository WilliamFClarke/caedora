import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // No data collection - all user data lives in their own git repos
  output: 'standalone',
  transpilePackages: ['@caedora/shared'],
}

export default nextConfig

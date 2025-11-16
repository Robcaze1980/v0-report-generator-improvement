/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Force fresh builds by disabling build cache if needed
  generateBuildId: async () => {
    // Generate unique build ID to bypass cache issues
    return `build-${Date.now()}`
  },
}

module.exports = nextConfig

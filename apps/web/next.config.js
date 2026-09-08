/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['geist'],
  // Required by Reown AppKit + wagmi (pino / lokijs / encoding are Node-only).
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
}

module.exports = nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['geist'],
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding', '@farcaster/mini-app-solana')
    return config
  },
}

module.exports = nextConfig

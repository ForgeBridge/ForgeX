/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  transpilePackages: ['geist'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    workerThreads: true,
  },
  webpack: (config, { isServer }) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    config.resolve.alias['@farcaster/mini-app-solana'] = path.join(__dirname, 'src/stubs/empty.js')
    config.cache = { type: 'filesystem' }
    return config
  },
}

module.exports = nextConfig

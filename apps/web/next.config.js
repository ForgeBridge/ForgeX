/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  transpilePackages: ['geist'],
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    config.resolve.alias['@farcaster/mini-app-solana'] = path.join(__dirname, 'src/stubs/empty.js')
    return config
  },
}

module.exports = nextConfig

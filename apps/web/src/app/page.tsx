'use client'

import { TokenFeed } from '../components/tokens/TokenFeed'

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Token Feed</h1>
      <TokenFeed />
    </div>
  )
}

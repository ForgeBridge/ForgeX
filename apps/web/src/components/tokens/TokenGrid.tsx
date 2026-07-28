'use client'

import { TokenCard } from './TokenCard'

interface TokenGridProps {
  tokens: Array<{
    name: string
    symbol: string
    marketCap: string
    price: string
    imageUri?: string
    createdAt: number
  }>
}

export function TokenGrid({ tokens }: TokenGridProps) {
  if (tokens.length === 0) {
    return (
      <p className="text-[var(--forgex-text-muted)] col-span-full text-center py-12">
        No tokens yet. Be the first to create one!
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tokens.map((token) => (
        <TokenCard key={token.symbol} {...token} />
      ))}
    </div>
  )
}

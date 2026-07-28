'use client'

import { TokenCard } from './TokenCard'

const MOCK_TOKENS = [
  { name: 'ForgeX Doge', symbol: 'FDOGE', marketCap: '12,450', price: '0.00001', createdAt: Date.now() / 1000 - 3600 },
  { name: 'Stellar Pepe', symbol: 'SPEPE', marketCap: '8,230', price: '0.00005', createdAt: Date.now() / 1000 - 7200 },
]

export function TokenFeed() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {MOCK_TOKENS.map((token) => (
        <TokenCard key={token.symbol} {...token} />
      ))}
    </div>
  )
}

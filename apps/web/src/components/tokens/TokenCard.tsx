'use client'

import Link from 'next/link'
import { TokenAvatar } from './TokenAvatar'

export interface TokenCardProps {
  name: string
  symbol: string
  marketCap: string
  price: string
  imageUri?: string
  createdAt?: number
  tokenId?: string
}

export function TokenCard({ name, symbol, marketCap, price, imageUri, tokenId }: TokenCardProps) {
  const href = tokenId ? `/token/${tokenId}` : `/token/${symbol.toLowerCase()}`

  return (
    <Link href={href} className="block group">
      <div className="bg-[var(--forgex-surface)] rounded-xl border border-[var(--forgex-border)] p-5 hover:border-[var(--forgex-primary)] transition-all duration-200 hover:shadow-lg group-hover:scale-[1.01]">
        <div className="flex items-center gap-3.5 mb-4">
          <TokenAvatar symbol={symbol} imageUri={imageUri} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate text-[var(--forgex-text)] group-hover:text-[var(--forgex-primary)] transition-colors">
              {name}
            </h3>
            <span className="text-xs font-medium text-[var(--forgex-text-muted)]">${symbol}</span>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between py-1 border-b border-[var(--forgex-border)]/50">
            <span className="text-[var(--forgex-text-muted)]">Market Cap</span>
            <span className="font-semibold font-mono text-[var(--forgex-text)]">{marketCap} XLM</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-[var(--forgex-text-muted)]">Price</span>
            <span className="font-semibold font-mono text-[var(--forgex-primary)]">{price} XLM</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

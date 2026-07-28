'use client'

interface TokenCardProps {
  name: string
  symbol: string
  marketCap: string
  price: string
  imageUri?: string
  createdAt: number
}

export function TokenCard({ name, symbol, marketCap, price, createdAt }: TokenCardProps) {
  return (
    <div className="bg-[var(--forgex-surface)] rounded-lg border border-[var(--forgex-border)] p-4 hover:border-[var(--forgex-primary)] transition-colors cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold">{name}</h3>
          <span className="text-sm text-[var(--forgex-text-muted)]">${symbol}</span>
        </div>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--forgex-text-muted)]">Market Cap</span>
          <span>{marketCap} XLM</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--forgex-text-muted)]">Price</span>
          <span>{price} XLM</span>
        </div>
      </div>
    </div>
  )
}

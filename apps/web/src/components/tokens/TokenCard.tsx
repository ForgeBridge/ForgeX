'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
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

export function TokenCard({
  name,
  symbol,
  marketCap,
  price,
  imageUri,
  tokenId,
}: TokenCardProps) {
  const href = tokenId ? `/token/${tokenId}` : `/token/${symbol.toLowerCase()}`

  return (
    <Link
      href={href}
      className="block group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-card rounded-lg border border-border p-4 hover:border-primary/40 hover:shadow-elevated transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 mb-3">
          <TokenAvatar symbol={symbol} imageUri={imageUri} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {name}
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              ${symbol}
            </span>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 text-[11px] font-mono font-semibold text-success">
            <span aria-hidden="true">▲</span> live
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1.5 border-t border-border">
            <span className="text-muted-foreground">Market Cap</span>
            <span className="font-semibold font-mono text-foreground tnum">
              {marketCap} XLM
            </span>
          </div>
          <div className="flex justify-between pb-1">
            <span className="text-muted-foreground">Price</span>
            <span className="font-semibold font-mono text-primary tnum">
              {price} XLM
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

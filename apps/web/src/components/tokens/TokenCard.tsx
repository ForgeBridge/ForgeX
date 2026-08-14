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
    <Link href={href} className="block group">
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-card rounded-lg border border-border p-4 hover:border-primary/30 transition-colors"
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
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1.5 border-t border-border">
            <span className="text-muted-foreground">Market Cap</span>
            <span className="font-semibold font-mono text-foreground">
              {marketCap} XLM
            </span>
          </div>
          <div className="flex justify-between pb-1">
            <span className="text-muted-foreground">Price</span>
            <span className="font-semibold font-mono text-primary">
              {price} XLM
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { TokenAvatar } from './TokenAvatar'
import { sound } from '../../lib/sound'

export interface TokenCardProps {
  name: string
  symbol: string
  marketCap: string
  price: string
  imageUri?: string
  createdAt?: number
  tokenId?: string
  /** 24h price change percentage */
  priceChange24h?: number
  /** Graduation progress 0-100 */
  graduationProgress?: number
  /** Whether token has graduated to DEX */
  isGraduated?: boolean
  /** Reserve XLM amount */
  reserveXlm?: string
  /** Target XLM for graduation */
  targetXlm?: string
}

function MiniSparkline({ progress = 50 }: { progress?: number }) {
  // Generate a smooth exponential curve path
  const points: [number, number][] = []
  const count = 20
  for (let i = 0; i <= count; i++) {
    const t = i / count
    const x = t * 100
    const y = 40 - (Math.exp(2.4 * t) - 1) / (Math.exp(2.4) - 1) * 34
    points.push([x, y])
  }

  const svgPath = points
    .map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'} ${x} ${y}`)
    .join(' ')

  const markerX = Math.min(98, Math.max(2, progress))

  return (
    <div className="mt-3 p-2 rounded-md bg-muted/40 border border-border/50 relative overflow-hidden">
      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
        <span>Bonding Trajectory</span>
        <span className="text-primary font-medium">{progress}% to DEX</span>
      </div>
      <svg
        className="w-full h-11 overflow-visible"
        viewBox="0 0 100 44"
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          y1="40"
          x2="100"
          y2="40"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="1"
        />
        <path
          d={`${svgPath} L 100 42 L 0 42 Z`}
          fill="rgba(37, 99, 235, 0.08)"
        />
        <path
          d={svgPath}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          cx={markerX}
          cy={40 - (Math.exp(2.4 * (markerX / 100)) - 1) / (Math.exp(2.4) - 1) * 34}
          r="3.5"
          fill="#ea580c"
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  )
}

export function TokenCard({
  name,
  symbol,
  marketCap,
  price,
  imageUri,
  tokenId,
  createdAt,
  priceChange24h,
  graduationProgress,
  isGraduated,
  reserveXlm,
  targetXlm,
}: TokenCardProps) {
  const href = tokenId ? `/token/${tokenId}` : `/token/${symbol.toLowerCase()}`
  const progress = graduationProgress ?? Math.floor(Math.random() * 80 + 10)

  return (
    <Link
      href={href}
      className="block group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-card rounded-lg border border-border p-4 hover:border-primary/40 hover:shadow-elevated transition-colors cursor-pointer flex flex-col justify-between"
      >
        <div>
          {/* Header: Avatar, Name, Change */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <TokenAvatar symbol={symbol} imageUri={imageUri} size="md" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground font-mono">
                    ${symbol}
                  </span>
                  {createdAt && (
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {formatTimeAgo(createdAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {priceChange24h !== undefined && (
              <span
                className={`shrink-0 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-mono font-semibold ${
                  priceChange24h >= 0
                    ? 'bg-success/10 text-success'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {priceChange24h >= 0 ? '↗' : '↘'}{' '}
                {priceChange24h >= 0 ? '+' : ''}
                {priceChange24h}%
              </span>
            )}
          </div>

          {/* Mini Bonding Curve Sparkline */}
          <MiniSparkline progress={progress} />

          {/* Price & Market Cap */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-border text-xs">
            <div>
              <span className="text-muted-foreground text-[11px]">Price</span>
              <p className="font-mono font-bold text-foreground tnum mt-0.5">
                {price} XLM
              </p>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px]">
                Market Cap
              </span>
              <p className="font-mono font-semibold text-foreground tnum mt-0.5">
                {marketCap} XLM
              </p>
            </div>
          </div>
        </div>

        {/* Bottom: Graduation status + Trade */}
        <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between">
          {isGraduated ? (
            <span className="inline-flex items-center gap-1 text-forge font-semibold text-[11px] font-mono">
              <svg
                className="w-3.5 h-3.5 fill-forge text-forge"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              Graduated (DEX LP Burned)
            </span>
          ) : (
            <div className="w-full">
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1 font-mono">
                <span>Reserve: {reserveXlm ?? '—'}</span>
                <span>Target: {targetXlm ?? '—'}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-forge transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <Link
            href={href}
            onClick={(e) => {
              e.stopPropagation()
              sound.playClick()
            }}
            className="ml-3 shrink-0 px-2.5 py-1 rounded bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-semibold text-xs transition-colors"
          >
            Trade
          </Link>
        </div>
      </motion.div>
    </Link>
  )
}

function formatTimeAgo(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) return ''
  const now = Math.floor(Date.now() / 1000)
  const diff = Math.max(0, now - timestamp)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

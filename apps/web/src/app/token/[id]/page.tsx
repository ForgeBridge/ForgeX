'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PriceChart } from '../../../components/trade/PriceChart'
import { TradePanel } from '../../../components/trade/TradePanel'
import { PageLoader } from '../../../components/ui/PageLoader'
import { formatXLM } from '../../../lib/format'

export default function TokenDetailPage() {
  const params = useParams()
  const tokenId = (params?.id as string) || ''

  const [loading, setLoading] = useState(true)
  const [tokenData, setTokenData] = useState<{
    name: string
    symbol: string
    price: string
    marketCap: string
    reserve: string
    description: string
  } | null>(null)

  useEffect(() => {
    // Simulated token fetch
    setLoading(true)
    const timer = setTimeout(() => {
      setTokenData({
        name: 'Forge Token',
        symbol: 'FORGE',
        price: '0.0001',
        marketCap: '100,000',
        reserve: '5,000',
        description: 'First community forged token on Stellar Soroban with exponential bonding curve.',
      })
      setLoading(false)
    }, 150)
    return () => clearTimeout(timer)
  }, [tokenId])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <PageLoader message="Loading token and bonding curve details…" />
      </div>
    )
  }

  if (!tokenData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-[var(--forgex-text-muted)]">Token not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--forgex-surface)] p-6 rounded-lg border border-[var(--forgex-border)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold">{tokenData.name}</h1>
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[var(--forgex-primary)]/20 text-[var(--forgex-primary)]">
              ${tokenData.symbol}
            </span>
          </div>
          <p className="text-xs text-[var(--forgex-text-muted)] mt-1 font-mono break-all">
            {tokenId}
          </p>
        </div>

        <div className="flex gap-6 text-sm">
          <div>
            <div className="text-xs text-[var(--forgex-text-muted)]">Market Cap</div>
            <div className="font-bold font-mono">{tokenData.marketCap} XLM</div>
          </div>
          <div>
            <div className="text-xs text-[var(--forgex-text-muted)]">Reserve</div>
            <div className="font-bold font-mono">{tokenData.reserve} XLM</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PriceChart symbol={tokenData.symbol} currentPrice={tokenData.price} />
          <div className="bg-[var(--forgex-surface)] p-5 rounded-lg border border-[var(--forgex-border)]">
            <h3 className="text-sm font-semibold mb-2">About {tokenData.name}</h3>
            <p className="text-sm text-[var(--forgex-text-muted)]">{tokenData.description}</p>
          </div>
        </div>

        <div className="lg:col-span-1">
          <TradePanel
            curveContractId={tokenId}
            tokenSymbol={tokenData.symbol}
            tokenPrice={tokenData.price}
          />
        </div>
      </div>
    </div>
  )
}

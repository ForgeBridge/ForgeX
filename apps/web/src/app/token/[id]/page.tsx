'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { PriceChart } from '../../../components/trade/PriceChart'
import { TradePanel } from '../../../components/trade/TradePanel'
import { PageLoader } from '../../../components/ui/PageLoader'
import { ErrorView } from '../../../components/ui/ErrorView'
import { EmptyState } from '../../../components/ui/EmptyState'

export default function TokenDetailPage() {
  const params = useParams()
  const tokenId = (params?.id as string) || ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenData, setTokenData] = useState<{
    name: string
    symbol: string
    price: string
    marketCap: string
    reserve: string
    description: string
  } | null>(null)

  const fetchTokenData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!tokenId) {
        throw new Error('Token ID is required')
      }
      // Simulated token fetch with fallback
      await new Promise((resolve) => setTimeout(resolve, 150))
      setTokenData({
        name: 'Forge Token',
        symbol: 'FORGE',
        price: '0.0001',
        marketCap: '100,000',
        reserve: '5,000',
        description: 'First community forged token on Stellar Soroban with exponential bonding curve.',
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token data')
    } finally {
      setLoading(false)
    }
  }, [tokenId])

  useEffect(() => {
    fetchTokenData()
  }, [fetchTokenData])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <PageLoader message="Loading token and bonding curve details…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <ErrorView
          title="Failed to load token details"
          message={error}
          onRetry={fetchTokenData}
          retryLabel="Retry"
        />
      </div>
    )
  }

  if (!tokenData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <EmptyState
          title="Token Not Found"
          description={`No bonding curve or token contract was found matching identifier "${tokenId}".`}
          actionLabel="Explore Tokens"
          actionHref="/"
        />
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

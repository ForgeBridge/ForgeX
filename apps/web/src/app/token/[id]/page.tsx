'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { PriceChart } from '../../../components/trade/PriceChart'
import { TradePanel } from '../../../components/trade/TradePanel'
import { PageLoader } from '../../../components/ui/PageLoader'
import { ErrorView } from '../../../components/ui/ErrorView'
import { EmptyState } from '../../../components/ui/EmptyState'
import { TokenAvatar } from '../../../components/tokens/TokenAvatar'
import { usePolling } from '../../../hooks/usePolling'
import { useWalletStore } from '../../../hooks/useWallet'

export default function TokenDetailPage() {
  const params = useParams()
  const tokenId = (params?.id as string) || ''
  const { fetchBalance } = useWalletStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenData, setTokenData] = useState<{
    name: string
    symbol: string
    price: string
    marketCap: string
    reserve: string
    description: string
    imageUri?: string
  } | null>(null)

  const fetchTokenData = useCallback(async () => {
    try {
      if (!tokenId) {
        throw new Error('Token ID is required')
      }
      // Simulated token fetch with fallback
      await new Promise((resolve) => setTimeout(resolve, 50))
      setTokenData((prev) => ({
        name: prev?.name || 'Forge Token',
        symbol: prev?.symbol || 'FORGE',
        price: prev?.price || '0.0001',
        marketCap: prev?.marketCap || '100,000',
        reserve: prev?.reserve || '5,000',
        description: prev?.description || 'First community forged token on Stellar Soroban with exponential bonding curve.',
        imageUri: prev?.imageUri,
      }))
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token data')
    } finally {
      setLoading(false)
    }
  }, [tokenId])

  // Periodic polling for token price and wallet balance every 5 seconds
  const { refresh, isPolling } = usePolling(
    useCallback(async () => {
      await Promise.all([fetchTokenData(), fetchBalance()])
    }, [fetchTokenData, fetchBalance]),
    { intervalMs: 5000, pauseOnHidden: true, immediate: true }
  )

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
          onRetry={refresh}
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
        <div className="flex items-center gap-4">
          <TokenAvatar
            symbol={tokenData.symbol}
            imageUri={tokenData.imageUri}
            size="lg"
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold">{tokenData.name}</h1>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[var(--forgex-primary)]/20 text-[var(--forgex-primary)]">
                ${tokenData.symbol}
              </span>
              {isPolling && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20" title="Real-time updates active">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--forgex-text-muted)] mt-1 font-mono break-all">
              {tokenId}
            </p>
          </div>
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

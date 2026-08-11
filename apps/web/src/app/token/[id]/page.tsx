'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { PriceChart } from '../../../components/trade/PriceChart'
import { TradePanel } from '../../../components/trade/TradePanel'
import { PageLoader } from '../../../components/ui/PageLoader'
import { ErrorView } from '../../../components/ui/ErrorView'
import { EmptyState } from '../../../components/ui/EmptyState'
import { TokenDetailHeader } from '../../../components/tokens/TokenDetailHeader'
import { TokenStatsRow, TokenStats } from '../../../components/tokens/TokenStatsRow'
import { RecentTrades, TradeItem } from '../../../components/tokens/RecentTrades'
import { usePolling } from '../../../hooks/usePolling'
import { useWalletStore } from '../../../hooks/useWallet'
import { useTradeStore } from '../../../hooks/useBondingCurve'

export default function TokenDetailPage() {
  const params = useParams()
  const tokenId = (params?.id as string) || ''
  const { fetchBalance, network } = useWalletStore()
  const refreshCounter = useTradeStore((state) => state.refreshCounter)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenData, setTokenData] = useState<{
    name: string
    symbol: string
    tokenId: string
    curveId?: string
    creator?: string
    createdAt?: number
    description?: string
    imageUri?: string
    website?: string
    stats: TokenStats
    recentTrades: TradeItem[]
  } | null>(null)

  const fetchTokenData = useCallback(async () => {
    try {
      if (!tokenId) {
        throw new Error('Token ID is required')
      }
      // Simulated token fetch with fallback
      await new Promise((resolve) => setTimeout(resolve, 50))
      const now = Math.floor(Date.now() / 1000)
      setTokenData((prev) => ({
        name: prev?.name || 'Forge Token',
        symbol: prev?.symbol || 'FORGE',
        tokenId,
        curveId: prev?.curveId || `${tokenId}_curve`,
        creator: prev?.creator || 'GDJY...CREATOR',
        createdAt: prev?.createdAt || now - 86400 * 3,
        description: prev?.description || 'First community forged token on Stellar Soroban with exponential bonding curve.',
        imageUri: prev?.imageUri,
        website: 'https://forgex.fi',
        stats: {
          price: prev?.stats.price || '0.0001',
          priceChange24h: prev?.stats.priceChange24h ?? 4.25,
          marketCap: prev?.stats.marketCap || '100,000',
          reserveBalance: prev?.stats.reserveBalance || '5,000',
          totalSupply: '1,000,000,000',
          circulatingSupply: '650,000,000',
          volume24h: '12,850',
          tradeCount24h: 38,
          graduationThreshold: '50,000',
        },
        recentTrades: prev?.recentTrades || [
          {
            id: 'tx_1',
            type: 'buy',
            tokenAmount: '50,000',
            xlmAmount: '5.00',
            price: '0.0001',
            account: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
            timestamp: now - 120,
          },
          {
            id: 'tx_2',
            type: 'sell',
            tokenAmount: '12,500',
            xlmAmount: '1.25',
            price: '0.0001',
            account: 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBWHF',
            timestamp: now - 600,
          },
          {
            id: 'tx_3',
            type: 'buy',
            tokenAmount: '100,000',
            xlmAmount: '10.00',
            price: '0.0001',
            account: 'GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCWHF',
            timestamp: now - 3600,
          },
        ],
      }))
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token data')
    } finally {
      setLoading(false)
    }
  }, [tokenId])

  // Periodic polling for token price, wallet balance, and trade events every 5 seconds
  const { refresh, isPolling } = usePolling(
    useCallback(async () => {
      await Promise.all([fetchTokenData(), fetchBalance()])
    }, [fetchTokenData, fetchBalance]),
    { intervalMs: 5000, pauseOnHidden: true, immediate: true }
  )

  // Trigger refresh on trade store events
  useEffect(() => {
    if (refreshCounter > 0) {
      fetchTokenData()
    }
  }, [refreshCounter, fetchTokenData])

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
      <TokenDetailHeader
        metadata={tokenData}
        network={network}
        isLive={isPolling}
      />

      <TokenStatsRow stats={tokenData.stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PriceChart symbol={tokenData.symbol} currentPrice={tokenData.stats.price} />
          <RecentTrades
            trades={tokenData.recentTrades}
            tokenSymbol={tokenData.symbol}
            network={network}
          />
        </div>

        <div className="lg:col-span-1">
          <TradePanel
            curveContractId={tokenId}
            tokenSymbol={tokenData.symbol}
            tokenPrice={tokenData.stats.price}
          />
        </div>
      </div>
    </div>
  )
}

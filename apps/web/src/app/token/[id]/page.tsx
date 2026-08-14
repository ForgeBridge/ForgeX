'use client'

import { motion } from 'framer-motion'
import { PriceChart } from '../../../components/trade/PriceChart'
import { TradePanel } from '../../../components/trade/TradePanel'
import { PageLoader } from '../../../components/ui/PageLoader'
import { ErrorView } from '../../../components/ui/ErrorView'
import { EmptyState } from '../../../components/ui/EmptyState'
import { TokenDetailHeader } from '../../../components/tokens/TokenDetailHeader'
import { TokenStatsRow } from '../../../components/tokens/TokenStatsRow'
import { RecentTrades } from '../../../components/tokens/RecentTrades'
import { usePolling } from '../../../hooks/usePolling'
import { useWalletStore } from '../../../hooks/useWallet'
import { useTradeStore } from '../../../hooks/useBondingCurve'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { TokenStats } from '../../../components/tokens/TokenStatsRow'
import type { TradeItem } from '../../../components/tokens/RecentTrades'

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
      if (!tokenId) throw new Error('Token ID is required')
      await new Promise((resolve) => setTimeout(resolve, 50))
      const now = Math.floor(Date.now() / 1000)
      setTokenData((prev) => ({
        name: prev?.name || 'Forge Token',
        symbol: prev?.symbol || 'FORGE',
        tokenId,
        curveId: prev?.curveId || `${tokenId}_curve`,
        creator: prev?.creator || 'GDJY...CREATOR',
        createdAt: prev?.createdAt || now - 86400 * 3,
        description:
          prev?.description ||
          'Community forged token on Stellar Soroban with exponential bonding curve.',
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
        ],
      }))
      setError(null)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch token data'
      )
    } finally {
      setLoading(false)
    }
  }, [tokenId])

  const { refresh, isPolling } = usePolling(
    useCallback(async () => {
      await Promise.all([fetchTokenData(), fetchBalance()])
    }, [fetchTokenData, fetchBalance]),
    { intervalMs: 5000, pauseOnHidden: true, immediate: true }
  )

  useEffect(() => {
    if (refreshCounter > 0) fetchTokenData()
  }, [refreshCounter, fetchTokenData])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PageLoader message="Loading token details..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ErrorView
          title="Failed to load token"
          message={error}
          onRetry={refresh}
          retryLabel="Retry"
        />
      </div>
    )
  }

  if (!tokenData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <EmptyState
          title="Token Not Found"
          description={`No token found matching "${tokenId}".`}
          actionLabel="Explore Tokens"
          actionHref="/explore"
        />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <TokenDetailHeader
          metadata={tokenData}
          network={network}
          isLive={isPolling}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <TokenStatsRow stats={tokenData.stats} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <PriceChart
              symbol={tokenData.symbol}
              currentPrice={tokenData.stats.price}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <RecentTrades
              trades={tokenData.recentTrades}
              tokenSymbol={tokenData.symbol}
              network={network}
            />
          </motion.div>
        </div>

        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <TradePanel
              curveContractId={tokenId}
              tokenSymbol={tokenData.symbol}
              tokenPrice={tokenData.stats.price}
            />
          </motion.div>
        </div>
      </div>
    </div>
  )
}

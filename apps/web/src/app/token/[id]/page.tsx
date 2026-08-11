'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { PriceChart } from '../../../components/trade/PriceChart'
import { TradePanel } from '../../../components/trade/TradePanel'
import { PageLoader } from '../../../components/ui/PageLoader'
import { ErrorView } from '../../../components/ui/ErrorView'
import { EmptyState } from '../../../components/ui/EmptyState'
import { TokenDetailHeader } from '../../../components/tokens/TokenDetailHeader'
import { usePolling } from '../../../hooks/usePolling'
import { useWalletStore } from '../../../hooks/useWallet'

export default function TokenDetailPage() {
  const params = useParams()
  const tokenId = (params?.id as string) || ''
  const { fetchBalance, network } = useWalletStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenData, setTokenData] = useState<{
    name: string
    symbol: string
    tokenId: string
    curveId?: string
    creator?: string
    createdAt?: number
    price: string
    marketCap: string
    reserve: string
    description: string
    imageUri?: string
    website?: string
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
        tokenId,
        curveId: prev?.curveId || `${tokenId}_curve`,
        creator: prev?.creator || 'GDJY...CREATOR',
        createdAt: prev?.createdAt || Math.floor(Date.now() / 1000) - 86400 * 3,
        price: prev?.price || '0.0001',
        marketCap: prev?.marketCap || '100,000',
        reserve: prev?.reserve || '5,000',
        description: prev?.description || 'First community forged token on Stellar Soroban with exponential bonding curve.',
        imageUri: prev?.imageUri,
        website: 'https://forgex.fi',
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
      <TokenDetailHeader
        metadata={tokenData}
        network={network}
        isLive={isPolling}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PriceChart symbol={tokenData.symbol} currentPrice={tokenData.price} />
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

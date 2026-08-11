'use client'

import { useEffect } from 'react'
import { TokenCard } from './TokenCard'
import { useTokenStore } from '../../hooks/useToken'
import { PageLoader } from '../ui/PageLoader'
import { ErrorView } from '../ui/ErrorView'

const DEFAULT_MOCK_TOKENS = [
  { name: 'ForgeX Doge', symbol: 'FDOGE', marketCap: '12,450', price: '0.00001', createdAt: Date.now() / 1000 - 3600 },
  { name: 'Stellar Pepe', symbol: 'SPEPE', marketCap: '8,230', price: '0.00005', createdAt: Date.now() / 1000 - 7200 },
]

export interface TokenFeedProps {
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export function TokenFeed({ loading: customLoading, error: customError, onRetry: customRetry }: TokenFeedProps) {
  const { tokens, loading: storeLoading, error: storeError, fetchTokens, retry } = useTokenStore()
  const isLoading = customLoading !== undefined ? customLoading : storeLoading
  const error = customError !== undefined ? customError : storeError
  const handleRetry = customRetry || retry

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  if (isLoading) {
    return <PageLoader message="Loading tokens from Soroban…" />
  }

  if (error) {
    return (
      <ErrorView
        title="Could not load tokens"
        message={error}
        onRetry={handleRetry}
        retryLabel="Retry loading"
      />
    )
  }

  const displayTokens = tokens.length > 0 ? tokens : DEFAULT_MOCK_TOKENS

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy={isLoading}>
      {displayTokens.map((token) => (
        <TokenCard key={token.symbol} {...token} />
      ))}
    </div>
  )
}

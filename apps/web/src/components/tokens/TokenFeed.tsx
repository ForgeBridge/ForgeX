'use client'

import { useEffect } from 'react'
import { TokenCard } from './TokenCard'
import { useTokenStore, TokenItem } from '../../hooks/useToken'
import { PageLoader } from '../ui/PageLoader'
import { ErrorView } from '../ui/ErrorView'
import { EmptyState } from '../ui/EmptyState'

export interface TokenFeedProps {
  tokens?: TokenItem[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export function TokenFeed({
  tokens: customTokens,
  loading: customLoading,
  error: customError,
  onRetry: customRetry,
}: TokenFeedProps) {
  const { tokens: storeTokens, loading: storeLoading, error: storeError, fetchTokens, retry } = useTokenStore()
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

  const tokens = customTokens !== undefined ? customTokens : storeTokens

  if (tokens.length === 0) {
    return (
      <EmptyState
        title="No Tokens Found"
        description="No bonding curve tokens have been forged on this network yet. Launch the very first one!"
        actionLabel="Create Token"
        actionHref="/create"
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy={isLoading}>
      {tokens.map((token) => (
        <TokenCard key={token.symbol} {...token} />
      ))}
    </div>
  )
}

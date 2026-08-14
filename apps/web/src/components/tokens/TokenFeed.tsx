'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { TokenCard } from './TokenCard'
import { TokenFeedSkeleton } from './TokenCardSkeleton'
import { useTokenStore, TokenItem } from '../../hooks/useToken'
import { ErrorView } from '../ui/ErrorView'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'

export type SortOption = 'marketCap' | 'newest' | 'price'

export interface TokenFeedProps {
  tokens?: TokenItem[]
  loading?: boolean
  error?: string | null
  pageSize?: number
  onRetry?: () => void
}

export function TokenFeed({
  tokens: customTokens,
  loading: customLoading,
  error: customError,
  pageSize = 6,
  onRetry: customRetry,
}: TokenFeedProps) {
  const {
    tokens: storeTokens,
    loading: storeLoading,
    error: storeError,
    fetchTokens,
    retry,
  } = useTokenStore()
  const isLoading =
    customLoading !== undefined ? customLoading : storeLoading
  const error = customError !== undefined ? customError : storeError
  const handleRetry = customRetry || retry

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('marketCap')
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, sortBy])

  const sourceTokens =
    customTokens !== undefined ? customTokens : storeTokens

  const filteredTokens = useMemo(() => {
    let result = [...sourceTokens]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.symbol.toLowerCase().includes(q) ||
          (t.tokenId && t.tokenId.toLowerCase().includes(q))
      )
    }

    result.sort((a, b) => {
      if (sortBy === 'marketCap') {
        const numA = parseFloat(a.marketCap.replace(/,/g, '')) || 0
        const numB = parseFloat(b.marketCap.replace(/,/g, '')) || 0
        return numB - numA
      }
      if (sortBy === 'price') {
        const numA = parseFloat(a.price.replace(/,/g, '')) || 0
        const numB = parseFloat(b.price.replace(/,/g, '')) || 0
        return numB - numA
      }
      if (sortBy === 'newest') {
        return b.createdAt - a.createdAt
      }
      return 0
    })

    return result
  }, [sourceTokens, searchQuery, sortBy])

  const paginatedTokens = useMemo(() => {
    return filteredTokens.slice(0, page * pageSize)
  }, [filteredTokens, page, pageSize])

  const hasMore = paginatedTokens.length < filteredTokens.length

  const handleLoadMore = () => {
    setLoadingMore(true)
    setTimeout(() => {
      setPage((prev) => prev + 1)
      setLoadingMore(false)
    }, 100)
  }

  if (isLoading) {
    return <TokenFeedSkeleton count={pageSize} />
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

  if (sourceTokens.length === 0) {
    return (
      <EmptyState
        title="No Tokens Found"
        description="No bonding curve tokens have been forged on this network yet. Launch the first one!"
        actionLabel="Create Token"
        actionHref="/create"
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, symbol, or address..."
            aria-label="Search tokens"
            className="w-full h-9 px-3 pl-9 pr-8 rounded-md bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
          <svg
            className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-0.5"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="token-sort"
            className="text-xs text-muted-foreground font-medium whitespace-nowrap"
          >
            Sort:
          </label>
          <select
            id="token-sort"
            aria-label="Sort tokens"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            <option value="marketCap">Market Cap</option>
            <option value="newest">Newest</option>
            <option value="price">Price</option>
          </select>
        </div>
      </div>

      {filteredTokens.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg border border-border">
          <p className="text-sm font-medium text-foreground">
            No matching tokens
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search or filters.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-hover transition-colors"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            aria-busy={isLoading}
          >
            {paginatedTokens.map((token, i) => (
              <motion.div
                key={token.symbol}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <TokenCard {...token} />
              </motion.div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
            <span>
              Showing {paginatedTokens.length} of {filteredTokens.length}
            </span>
            {hasMore && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-4 py-2 rounded-md border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <Spinner size="sm" />
                    <span>Loading...</span>
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

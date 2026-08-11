'use client'

import { useState, useEffect, useMemo } from 'react'
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
  const { tokens: storeTokens, loading: storeLoading, error: storeError, fetchTokens, retry } = useTokenStore()
  const isLoading = customLoading !== undefined ? customLoading : storeLoading
  const error = customError !== undefined ? customError : storeError
  const handleRetry = customRetry || retry

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('marketCap')
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  // Reset page when search or sort changes
  useEffect(() => {
    setPage(1)
  }, [searchQuery, sortBy])

  const sourceTokens = customTokens !== undefined ? customTokens : storeTokens

  // Search and sort filtering
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

  // Pagination slice
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
        description="No bonding curve tokens have been forged on this network yet. Launch the very first one!"
        actionLabel="Create Token"
        actionHref="/create"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Search & Sort Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tokens by name, symbol, or contract address…"
            aria-label="Search tokens"
            className="w-full px-4 py-2.5 pl-10 pr-9 rounded-xl bg-[var(--forgex-surface)] border border-[var(--forgex-border)] text-sm text-[var(--forgex-text)] placeholder-[var(--forgex-text-muted)] focus:outline-none focus:border-[var(--forgex-primary)] transition-colors"
          />
          <svg
            className="w-4 h-4 text-[var(--forgex-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--forgex-text-muted)] hover:text-[var(--forgex-text)] p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2">
          <label htmlFor="token-sort" className="text-xs text-[var(--forgex-text-muted)] font-medium whitespace-nowrap">
            Sort by:
          </label>
          <select
            id="token-sort"
            aria-label="Sort tokens"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 rounded-xl bg-[var(--forgex-surface)] border border-[var(--forgex-border)] text-xs text-[var(--forgex-text)] focus:outline-none focus:border-[var(--forgex-primary)] cursor-pointer"
          >
            <option value="marketCap">Highest Market Cap</option>
            <option value="newest">Recently Created</option>
            <option value="price">Highest Price</option>
          </select>
        </div>
      </div>

      {/* Grid or Filter Empty State */}
      {filteredTokens.length === 0 ? (
        <div className="text-center py-16 px-4 bg-[var(--forgex-surface)] rounded-2xl border border-[var(--forgex-border)] space-y-4">
          <p className="text-lg font-semibold text-[var(--forgex-text)]">
            No matching tokens found
          </p>
          <p className="text-sm text-[var(--forgex-text-muted)] max-w-sm mx-auto">
            We could not find any tokens matching &quot;{searchQuery}&quot;. Try adjusting your search query or sorting options.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 rounded-lg bg-[var(--forgex-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy={isLoading}>
            {paginatedTokens.map((token) => (
              <TokenCard key={token.symbol} {...token} />
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--forgex-border)]/50 text-xs text-[var(--forgex-text-muted)]">
            <span>
              Showing {paginatedTokens.length} of {filteredTokens.length} tokens
            </span>

            {hasMore && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                aria-label="Load more tokens"
                className="px-5 py-2.5 rounded-xl bg-[var(--forgex-surface)] border border-[var(--forgex-border)] text-xs font-semibold text-[var(--forgex-text)] hover:border-[var(--forgex-primary)] hover:text-[var(--forgex-primary)] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Spinner size="sm" />
                    <span>Loading…</span>
                  </>
                ) : (
                  <span>Load More Tokens</span>
                )}
              </button>
            )}

            {!hasMore && filteredTokens.length > pageSize && (
              <span className="text-[var(--forgex-text-muted)] italic">
                All tokens loaded
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

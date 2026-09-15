'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TokenCard } from './TokenCard'
import { TokenFeedSkeleton } from './TokenCardSkeleton'
import { useTokenStore, TokenItem } from '../../hooks/useToken'
import { ErrorView } from '../ui/ErrorView'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import { sound } from '../../lib/sound'

export type SortOption = 'marketCap' | 'newest' | 'price' | 'graduated'
export type TabType = 'trending' | 'newest' | 'marketCap' | 'graduated'

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

  const [activeTab, setActiveTab] = useState<TabType>('trending')
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyNearGraduation, setOnlyNearGraduation] = useState(false)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, activeTab])

  const sourceTokens =
    customTokens !== undefined ? customTokens : storeTokens

  const filteredTokens = useMemo(() => {
    let result = [...sourceTokens]

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.symbol.toLowerCase().includes(q) ||
          (t.tokenId && t.tokenId.toLowerCase().includes(q))
      )
    }

    // Tab sorting
    switch (activeTab) {
      case 'trending':
        result.sort((a, b) => {
          const numA = parseFloat(a.marketCap.replace(/,/g, '')) || 0
          const numB = parseFloat(b.marketCap.replace(/,/g, '')) || 0
          return numB - numA
        })
        break
      case 'newest':
        result.sort((a, b) => b.createdAt - a.createdAt)
        break
      case 'marketCap':
        result.sort((a, b) => {
          const valA = parseFloat(a.marketCap.replace(/,/g, '')) || 0
          const valB = parseFloat(b.marketCap.replace(/,/g, '')) || 0
          return valB - valA
        })
        break
      case 'graduated':
        // Show all but sort graduated to top
        result.sort((a, b) => {
          const aG = (a as TokenItem & { isGraduated?: boolean }).isGraduated ? 1 : 0
          const bG = (b as TokenItem & { isGraduated?: boolean }).isGraduated ? 1 : 0
          return bG - aG
        })
        break
    }

    return result
  }, [sourceTokens, searchQuery, activeTab])

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
    <section className="py-12 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-forge tracking-wider uppercase mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-forge" />
              <span>LIVE ON THE CURVE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight font-display">
              The Board<span className="text-forge">.</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Every token, ranked by the market. Trade against the bonding
              curve or track DEX graduation.
            </p>
          </div>

          <Link
            href="/create"
            className="self-start md:self-auto px-4 py-2 rounded-md text-xs font-semibold tracking-tight bg-forge hover:bg-forge-hover text-forge-foreground transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
              />
            </svg>
            <span>Forge a Token</span>
          </Link>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-1.5 rounded-lg bg-card border border-border mb-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto p-0.5">
            {(
              [
                { id: 'trending', label: 'Trending', icon: '🔥' },
                { id: 'newest', label: 'Newest', icon: '🕐' },
                { id: 'marketCap', label: 'Market Cap', icon: '📊' },
                { id: 'graduated', label: 'Graduated', icon: '✓' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  sound.playClick()
                  setActiveTab(tab.id)
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium tracking-tight whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? tab.id === 'graduated'
                      ? 'bg-muted text-success font-semibold'
                      : 'bg-muted text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Search & Graduation Filter */}
          <div className="flex items-center gap-2 px-1">
            {/* Near Graduation Toggle */}
            <button
              type="button"
              onClick={() => {
                sound.playClick()
                setOnlyNearGraduation(!onlyNearGraduation)
              }}
              className={`px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-1.5 ${
                onlyNearGraduation
                  ? 'bg-forge/10 border border-forge text-forge'
                  : 'bg-muted/40 border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-forge" />
              <span>&gt;80% to DEX</span>
            </button>

            {/* Search Box */}
            <div className="relative flex-1 sm:w-60">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
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
              <input
                type="text"
                placeholder="Search symbol or name..."
                aria-label="Search tokens"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border rounded-md pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Token Grid */}
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
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
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
    </section>
  )
}

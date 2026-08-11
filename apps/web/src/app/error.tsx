'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '../components/ui/Button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log client error to console/monitoring
    console.error('App runtime error:', error)
  }, [error])

  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/30 mb-6 text-red-400 shadow-lg">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h1 className="text-3xl font-extrabold text-[var(--forgex-text)] mb-3">
        Something went wrong
      </h1>

      <p className="text-[var(--forgex-text-muted)] text-base mb-4 max-w-md mx-auto leading-relaxed">
        {error.message || 'An unexpected error occurred while communicating with the network.'}
      </p>

      {error.digest && (
        <p className="text-xs font-mono text-[var(--forgex-text-muted)] mb-8">
          Error Digest: {error.digest}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
        <Button onClick={reset} size="md">
          Try Again
        </Button>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-[var(--forgex-surface)] border border-[var(--forgex-border)] text-sm text-[var(--forgex-text)] font-medium hover:opacity-90 transition-opacity"
        >
          Return to Feed
        </Link>
      </div>
    </div>
  )
}

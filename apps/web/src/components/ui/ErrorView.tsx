'use client'

import { Button } from './Button'

export interface ErrorViewProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorView({
  title = 'Failed to load data',
  message = 'An error occurred while fetching information from Soroban RPC.',
  onRetry,
  retryLabel = 'Try Again',
}: ErrorViewProps) {
  return (
    <div
      role="alert"
      className="bg-[var(--forgex-surface)] border border-red-500/30 rounded-lg p-6 max-w-lg mx-auto text-center space-y-4 shadow-sm"
    >
      <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-[var(--forgex-text)]">{title}</h3>
        <p className="text-xs text-[var(--forgex-text-muted)] max-w-md mx-auto">{message}</p>
      </div>

      {onRetry && (
        <div className="pt-2">
          <Button size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

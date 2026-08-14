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
      className="bg-card border border-border rounded-lg p-6 max-w-lg mx-auto text-center space-y-4"
    >
      <div className="w-10 h-10 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          {message}
        </p>
      </div>

      {onRetry && (
        <div className="pt-1">
          <Button size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

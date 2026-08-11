'use client'

import { Spinner } from './Spinner'

export interface PageLoaderProps {
  message?: string
}

export function PageLoader({ message = 'Loading ForgeX data…' }: PageLoaderProps) {
  return (
    <div
      aria-live="polite"
      className="flex flex-col items-center justify-center min-h-[300px] py-12 space-y-4"
    >
      <Spinner size="lg" />
      <p className="text-sm font-medium text-[var(--forgex-text-muted)] animate-pulse">
        {message}
      </p>
    </div>
  )
}

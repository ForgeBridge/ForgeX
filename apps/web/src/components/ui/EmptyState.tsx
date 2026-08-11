'use client'

import Link from 'next/link'
import { Button } from './Button'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  const defaultIcon = (
    <svg
      className="w-12 h-12 text-[var(--forgex-text-muted)]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  )

  return (
    <div
      role="region"
      aria-label={title}
      className="bg-[var(--forgex-surface)] border border-[var(--forgex-border)] rounded-xl p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4"
    >
      <div className="w-16 h-16 bg-[var(--forgex-bg)] rounded-full flex items-center justify-center mx-auto border border-[var(--forgex-border)]">
        {icon || defaultIcon}
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-bold text-[var(--forgex-text)]">{title}</h3>
        {description && (
          <p className="text-sm text-[var(--forgex-text-muted)] max-w-sm mx-auto">
            {description}
          </p>
        )}
      </div>

      {(actionLabel && (actionHref || onAction)) && (
        <div className="pt-2">
          {actionHref ? (
            <Link href={actionHref}>
              <Button size="sm">{actionLabel}</Button>
            </Link>
          ) : (
            <Button size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

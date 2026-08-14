'use client'

import { useState, useEffect } from 'react'

export interface RiskDisclaimerProps {
  storageKey?: string
  dismissible?: boolean
  className?: string
}

export function RiskDisclaimer({
  storageKey = 'forgex_risk_disclaimer_dismissed',
  dismissible = true,
  className = '',
}: RiskDisclaimerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (dismissible && typeof window !== 'undefined') {
      const isDismissed = localStorage.getItem(storageKey) === 'true'
      setDismissed(isDismissed)
    }
  }, [dismissible, storageKey])

  const handleDismiss = () => {
    setDismissed(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true')
    }
  }

  if (dismissed) return null

  return (
    <div
      role="alert"
      className={`bg-warning/5 border border-warning/20 rounded-lg p-4 text-xs text-foreground transition-all ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold text-warning">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <span>Bonding Curve & Trading Risk Notice</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] underline text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? 'Less info' : 'Read risks'}
          </button>
          {dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss risk disclaimer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
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

      <p className="mt-2 leading-relaxed text-muted-foreground">
        Tokens on ForgeX use automated bonding curves on Stellar Soroban.
        Prices fluctuate dynamically with buys and sells, and capital loss is
        possible.
      </p>

      {expanded && (
        <ul className="mt-3 space-y-1.5 pl-4 list-disc text-[11px] text-muted-foreground border-t border-border pt-2">
          <li>
            Bonding curves have dynamic pricing: larger transactions may
            experience substantial slippage.
          </li>
          <li>
            All transactions on Stellar Soroban are final and cannot be
            reversed.
          </li>
          <li>
            Community tokens may have no intrinsic value and carry extreme
            volatility.
          </li>
          <li>
            Never trade funds you cannot afford to lose. Verify contracts
            before trading.
          </li>
        </ul>
      )}
    </div>
  )
}

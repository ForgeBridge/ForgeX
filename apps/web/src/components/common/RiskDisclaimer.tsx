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

  if (dismissed) {
    return null
  }

  return (
    <div
      role="alert"
      className={`bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-200/90 transition-all ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 font-bold text-amber-400">
          <svg
            className="w-4 h-4 flex-shrink-0 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>Bonding Curve & Trading Risk Notice</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] underline text-amber-400/80 hover:text-amber-300 transition-colors"
          >
            {expanded ? 'Less info' : 'Read risks'}
          </button>
          {dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss risk disclaimer"
              className="text-amber-400/60 hover:text-amber-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 leading-relaxed text-amber-200/80">
        Tokens created on ForgeX use automated bonding curves on Stellar Soroban. Token prices fluctuate dynamically with buys and sells, and capital loss is possible.
      </p>

      {expanded && (
        <ul className="mt-3 space-y-1.5 pl-4 list-disc text-[11px] text-amber-200/70 border-t border-amber-500/20 pt-2">
          <li>Bonding curves have dynamic pricing: larger transactions may experience substantial slippage.</li>
          <li>All transactions on Stellar Soroban are final and cannot be reversed or refunded.</li>
          <li>Community tokens may have no intrinsic value and carry extreme market volatility.</li>
          <li>Never trade funds you cannot afford to lose. Always verify token contracts before trading.</li>
        </ul>
      )}
    </div>
  )
}

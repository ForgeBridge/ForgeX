'use client'

import { useWalletStore } from '../../hooks/useWallet'

export function WalletErrorBanner() {
  const { error, clearError } = useWalletStore()

  if (!error) return null

  return (
    <aside
      aria-label="Wallet error alert"
      role="alert"
      className="bg-destructive/10 border-b border-destructive/30 text-destructive px-4 py-3 text-sm flex items-center justify-between animate-fade-in"
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
        <button
          type="button"
          onClick={clearError}
          className="text-destructive hover:text-destructive/80 p-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/50"
          aria-label="Dismiss wallet error"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
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
      </div>
    </aside>
  )
}

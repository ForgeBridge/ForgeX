'use client'

import { useWalletStore } from '../../hooks/useWallet'

export function WalletErrorBanner() {
  const { error, clearError } = useWalletStore()

  if (!error) return null

  return (
    <aside
      aria-label="Wallet error alert"
      role="alert"
      className="bg-red-500/10 border-b border-red-500/30 text-red-400 px-4 py-3 text-sm flex items-center justify-between shadow-sm animate-fadeIn"
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-red-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
        <button
          type="button"
          onClick={clearError}
          className="text-red-400 hover:text-red-300 p-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
          aria-label="Dismiss wallet error"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </aside>
  )
}

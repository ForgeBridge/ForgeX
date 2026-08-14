'use client'

import { useWalletStore } from '../../hooks/useWallet'

export function NetworkMismatchBanner() {
  const { isConnected, isNetworkMismatch, network } = useWalletStore()

  if (!isConnected || !isNetworkMismatch) return null

  const expectedNetworkName =
    network === 'testnet' ? 'Stellar Testnet' : 'Stellar Public / Mainnet'

  return (
    <aside
      aria-label="Network mismatch warning"
      role="alert"
      className="bg-warning/10 border-b border-warning/30 text-warning px-4 py-2.5 text-xs sm:text-sm"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <span>
            <strong>Network Mismatch:</strong> Your Freighter wallet is on a
            different network. Switch to <strong>{expectedNetworkName}</strong>{' '}
            to transact safely.
          </span>
        </div>
      </div>
    </aside>
  )
}

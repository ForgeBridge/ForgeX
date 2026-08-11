'use client'

import { useWalletStore } from '../../hooks/useWallet'
import { NETWORKS } from '../../lib/constants'

export function NetworkMismatchBanner() {
  const { isConnected, isNetworkMismatch, network } = useWalletStore()

  if (!isConnected || !isNetworkMismatch) return null

  const expectedNetworkName = network === 'testnet' ? 'Stellar Testnet' : 'Stellar Public / Mainnet'

  return (
    <aside
      aria-label="Network mismatch warning"
      role="alert"
      className="bg-amber-500/10 border-b border-amber-500/30 text-amber-300 px-4 py-2.5 text-xs sm:text-sm shadow-sm"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            <strong>Network Mismatch:</strong> Your Freighter wallet is connected to a different network. Please switch Freighter to <strong>{expectedNetworkName}</strong> to perform transactions safely.
          </span>
        </div>
      </div>
    </aside>
  )
}

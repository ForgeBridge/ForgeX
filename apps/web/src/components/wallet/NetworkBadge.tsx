'use client'

import { useWalletStore, SupportedNetwork } from '../../hooks/useWallet'

export function NetworkBadge() {
  const { network, setNetwork, isNetworkMismatch, isConnected } = useWalletStore()

  return (
    <div className="flex items-center gap-2">
      <div className="relative inline-block">
        <label htmlFor="network-select" className="sr-only">Select Network</label>
        <select
          id="network-select"
          aria-label="Select Network"
          value={network}
          onChange={(e) => setNetwork(e.target.value as SupportedNetwork)}
          className={`text-xs font-semibold py-1 px-2.5 rounded-full border cursor-pointer appearance-none pr-6 focus:outline-none transition-colors ${
            isNetworkMismatch
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:border-amber-400'
              : network === 'testnet'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:border-emerald-400'
              : 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:border-blue-400'
          }`}
        >
          <option value="testnet" className="bg-[var(--forgex-surface)] text-[var(--forgex-text)]">
            Testnet
          </option>
          <option value="mainnet" className="bg-[var(--forgex-surface)] text-[var(--forgex-text)]">
            Mainnet
          </option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-current">
          <svg className="w-3 h-3 fill-current opacity-70" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>

      {isConnected && isNetworkMismatch && (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse"
          title="Network mismatch between Freighter wallet and ForgeX app"
        >
          Mismatch
        </span>
      )}
    </div>
  )
}

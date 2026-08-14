'use client'

import { useWalletStore, SupportedNetwork } from '../../hooks/useWallet'

export function NetworkBadge() {
  const { network, setNetwork, isNetworkMismatch, isConnected } = useWalletStore()

  return (
    <div className="flex items-center gap-2">
      <div className="relative inline-block">
        <label htmlFor="network-select" className="sr-only">
          Select Network
        </label>
        <select
          id="network-select"
          aria-label="Select Network"
          value={network}
          onChange={(e) => setNetwork(e.target.value as SupportedNetwork)}
          className={`text-xs font-medium py-1 px-2.5 pr-6 rounded-md border cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
            isNetworkMismatch
              ? 'bg-warning/10 text-warning border-warning/30'
              : network === 'testnet'
              ? 'bg-muted text-muted-foreground border-border'
              : 'bg-primary/10 text-primary border-primary/30'
          }`}
        >
          <option value="testnet" className="bg-card text-foreground">
            Testnet
          </option>
          <option value="mainnet" className="bg-card text-foreground">
            Mainnet
          </option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-current">
          <svg className="w-3 h-3 fill-current opacity-50" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>

      {isConnected && isNetworkMismatch && (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/30"
          title="Network mismatch between Freighter and ForgeX"
        >
          Mismatch
        </span>
      )}
    </div>
  )
}

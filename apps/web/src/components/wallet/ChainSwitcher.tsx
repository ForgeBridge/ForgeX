'use client'

import { useChainStore } from '../../hooks/useEvmWalletStore'
import type { ActiveChain } from '../../lib/arc'

const CHAIN_LABELS: Record<ActiveChain, string> = {
  stellar: 'Stellar',
  arc: 'Arc',
}

/**
 * Switches the whole app between the Stellar and Arc deployments.
 *
 * Renders nothing when Arc is not configured, so a Stellar-only deployment shows
 * an unchanged UI.
 */
export function ChainSwitcher() {
  const { activeChain, availableChains, setActiveChain } = useChainStore()

  if (availableChains.length < 2) return null

  return (
    <div
      role="group"
      aria-label="Select blockchain"
      className="inline-flex items-center rounded-md border border-border bg-muted/50 p-0.5"
    >
      {availableChains.map((chain) => {
        const isActive = activeChain === chain
        return (
          <button
            key={chain}
            type="button"
            onClick={() => setActiveChain(chain)}
            aria-pressed={isActive}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {CHAIN_LABELS[chain]}
          </button>
        )
      })}
    </div>
  )
}

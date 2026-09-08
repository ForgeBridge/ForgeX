'use client'

import { createAppKit } from '@reown/appkit/react'
import {
  ethersAdapter,
  reownProjectId,
  evmNetworks,
  evmDefaultNetwork,
  reownMetadata,
} from '../../lib/reown'

if (reownProjectId && ethersAdapter) {
  createAppKit({
    adapters: [ethersAdapter],
    projectId: reownProjectId,
    networks: evmNetworks,
    defaultNetwork: evmDefaultNetwork,
    metadata: reownMetadata,
    themeMode: 'dark',
    themeVariables: { '--w3m-accent': '#2563eb' },
    features: { analytics: false },
  })
}

/**
 * Initializes the Reown modal when a project ID is configured.
 * The ethers adapter needs no extra providers, so this renders children
 * untouched either way — without a project ID the Stellar flow is unaffected.
 */
export function ReownProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, type Config } from 'wagmi'
import { createAppKit } from '@reown/appkit/react'
import {
  wagmiAdapter,
  reownProjectId,
  evmNetworks,
  evmDefaultNetwork,
  reownMetadata,
} from '../../lib/reown'

const queryClient = new QueryClient()

if (reownProjectId && wagmiAdapter) {
  createAppKit({
    adapters: [wagmiAdapter],
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
 * Mounts the Reown modal + wagmi providers when a project ID is configured.
 * Without one it renders children untouched so the Stellar flow keeps working.
 */
export function ReownProvider({ children }: { children: React.ReactNode }) {
  if (!wagmiAdapter) return <>{children}</>

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

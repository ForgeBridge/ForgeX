'use client'

import { useAppKit } from '@reown/appkit/react'
import { useAccount, useDisconnect } from 'wagmi'
import { isReownConfigured } from '../lib/reown'
import { truncateAddress } from '../lib/format'

export interface EvmWallet {
  isConfigured: boolean
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  chainName: string | null
  openConnect: () => void
  disconnect: () => void
}

/**
 * EVM-side wallet state, mirroring the Stellar `useWalletStore` shape.
 * Only mount behind `isReownConfigured` — wagmi/AppKit hooks need providers.
 */
export function useEvmWallet(): EvmWallet {
  const { open } = useAppKit()
  const { address, isConnected, isConnecting, chain } = useAccount()
  const { disconnect } = useDisconnect()

  return {
    isConfigured: isReownConfigured,
    address: address ?? null,
    isConnected,
    isConnecting,
    chainName: chain?.name ?? null,
    openConnect: () => open(),
    disconnect,
  }
}

export function formatEvmAddress(address: string): string {
  try {
    return truncateAddress(address, 6, 4)
  } catch {
    return address
  }
}

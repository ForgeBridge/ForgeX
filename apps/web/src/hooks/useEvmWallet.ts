'use client'

import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork,
  useDisconnect,
} from '@reown/appkit/react'
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
 * Only mount behind `isReownConfigured` — AppKit hooks need initialization.
 */
export function useEvmWallet(): EvmWallet {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { caipNetwork } = useAppKitNetwork()
  const { disconnect } = useDisconnect()

  return {
    isConfigured: isReownConfigured,
    address: address ?? null,
    isConnected,
    isConnecting: false,
    chainName: caipNetwork?.name ?? null,
    openConnect: () => open(),
    disconnect,
  }
}

export function formatEvmAddress(address: string): string {
  return truncateAddress(address, 6, 4)
}

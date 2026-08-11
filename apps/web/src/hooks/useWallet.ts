'use client'

import { create } from 'zustand'
import { NETWORKS, DEFAULT_NETWORK } from '../lib/constants'

export type SupportedNetwork = 'testnet' | 'mainnet'

/** Freighter API error shape */
interface FreighterApiError {
  code: number
  message: string
}

export interface WalletState {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  network: SupportedNetwork
  networkPassphrase: string | null
  isNetworkMismatch: boolean
  setNetwork: (network: SupportedNetwork) => void
  connect: () => Promise<void>
  disconnect: () => void
  clearError: () => void
  checkNetwork: () => Promise<void>
}

/**
 * Wallet store using Zustand for Freighter wallet connection and network management.
 * 
 * Security considerations:
 * - No private keys are stored or accessed
 * - Only public address is held in state
 * - Network mismatch detection protects against signing transactions on the wrong network
 * - Connection errors are sanitized before display
 */
export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  network: (process.env.NEXT_PUBLIC_DEFAULT_NETWORK as SupportedNetwork) || DEFAULT_NETWORK,
  networkPassphrase: null,
  isNetworkMismatch: false,

  setNetwork: (network: SupportedNetwork) => {
    const { networkPassphrase, isConnected } = get()
    const expectedPassphrase = NETWORKS[network]?.networkPassphrase
    const isMismatch = Boolean(isConnected && networkPassphrase && networkPassphrase !== expectedPassphrase)
    set({ network, isNetworkMismatch: isMismatch })
  },

  checkNetwork: async () => {
    try {
      const freighter = await import('@stellar/freighter-api')
      const networkResult = await freighter.getNetworkDetails()
      const networkPassphrase = networkResult.networkPassphrase ?? null
      const { network, isConnected } = get()
      const expectedPassphrase = NETWORKS[network]?.networkPassphrase
      const isMismatch = Boolean(isConnected && networkPassphrase && networkPassphrase !== expectedPassphrase)
      set({ networkPassphrase, isNetworkMismatch: isMismatch })
    } catch {
      // Ignored if freighter unavailable
    }
  },

  connect: async () => {
    if (get().isConnecting) return

    set({ isConnecting: true, error: null })

    try {
      const freighter = await import('@stellar/freighter-api')

      const connectionResult = await freighter.isConnected()
      if (connectionResult.error || !connectionResult.isConnected) {
        set({
          isConnecting: false,
          error: 'Freighter wallet extension not found. Please install it from the Chrome Web Store.',
        })
        return
      }

      const allowedResult = await freighter.isAllowed()
      if (!allowedResult.isAllowed) {
        await freighter.requestAccess()
      }

      const result = await freighter.getAddress()
      if (result.error) {
        const err = result.error as FreighterApiError
        set({
          isConnecting: false,
          error: sanitizeWalletError(err.message ?? 'Failed to get wallet address'),
        })
        return
      }

      const networkResult = await freighter.getNetworkDetails()
      const networkPassphrase = networkResult.networkPassphrase ?? null
      const currentNetwork = get().network
      const expectedPassphrase = NETWORKS[currentNetwork]?.networkPassphrase
      const isNetworkMismatch = Boolean(networkPassphrase && networkPassphrase !== expectedPassphrase)

      set({
        address: result.address,
        isConnected: true,
        isConnecting: false,
        error: null,
        networkPassphrase,
        isNetworkMismatch,
      })
    } catch (err) {
      const message =
        err instanceof Error
          ? sanitizeWalletError(err.message)
          : 'An unexpected error occurred while connecting wallet'
      set({
        isConnecting: false,
        error: message,
      })
    }
  },

  disconnect: () => {
    set({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      networkPassphrase: null,
      isNetworkMismatch: false,
    })
  },

  clearError: () => {
    set({ error: null })
  },
}))

function sanitizeWalletError(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('user rejected') || lower.includes('user denied') || lower.includes('cancelled')) {
    return 'Connection request was rejected by user'
  }
  if (lower.includes('not found') || lower.includes('not installed')) {
    return 'Freighter wallet extension not found. Please install it from the Chrome Web Store.'
  }
  if (lower.includes('network')) {
    return 'Network error while connecting to wallet. Please try again.'
  }
  if (lower.includes('timeout')) {
    return 'Connection timed out. Please try again.'
  }

  return 'Failed to connect wallet. Please try again.'
}

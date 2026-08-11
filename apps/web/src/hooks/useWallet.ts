'use client'

import { create } from 'zustand'

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
  networkPassphrase: string | null
  connect: () => Promise<void>
  disconnect: () => void
  clearError: () => void
}

/**
 * Wallet store using Zustand for Freighter wallet connection.
 * 
 * Security considerations:
 * - No private keys are stored or accessed
 * - Only public address is held in state
 * - Connection errors are sanitized before display
 * - Freighter extension handles all signing
 */
export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  networkPassphrase: null,

  connect: async () => {
    // Prevent concurrent connection attempts
    if (get().isConnecting) return

    set({ isConnecting: true, error: null })

    try {
      const freighter = await import('@stellar/freighter-api')

      // Check if Freighter extension is installed
      const connectionResult = await freighter.isConnected()
      if (connectionResult.error || !connectionResult.isConnected) {
        set({
          isConnecting: false,
          error: 'Freighter wallet extension not found. Please install it from the Chrome Web Store.',
        })
        return
      }

      // Request access if not already allowed
      const allowedResult = await freighter.isAllowed()
      if (!allowedResult.isAllowed) {
        await freighter.requestAccess()
      }

      // Get the public address
      const result = await freighter.getAddress()
      if (result.error) {
        const err = result.error as FreighterApiError
        set({
          isConnecting: false,
          error: sanitizeWalletError(err.message ?? 'Failed to get wallet address'),
        })
        return
      }

      // Get current network info
      const networkResult = await freighter.getNetworkDetails()
      const networkPassphrase = networkResult.networkPassphrase ?? null

      set({
        address: result.address,
        isConnected: true,
        isConnecting: false,
        error: null,
        networkPassphrase,
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
    })
  },

  clearError: () => {
    set({ error: null })
  },
}))

/**
 * Sanitize wallet error messages to prevent leaking internal details.
 * Only return user-safe error descriptions.
 */
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

  // Generic fallback — don't leak internal error details
  return 'Failed to connect wallet. Please try again.'
}

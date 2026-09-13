'use client'

import { usePrivyBridge } from '../../hooks/useWallet'

/**
 * Mounts the Privy → Zustand wallet bridge. Render once near the root,
 * inside the PrivyProvider. No-ops when Privy is not configured.
 */
export function PrivyWalletBridge() {
  usePrivyBridge()
  return null
}

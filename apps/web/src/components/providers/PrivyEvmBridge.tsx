'use client'

import { useEffect } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'

import { setEvmProvider, useEvmWalletEvents } from '../../hooks/useEvmWallet'
import { useEvmWalletStore } from '../../hooks/useEvmWalletStore'

interface EvmProviderLike {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
}

/**
 * Syncs Privy's EVM wallet into the Arc wallet store.
 *
 * Rendered once near the root, inside `PrivyProvider`, exactly like
 * `PrivyWalletBridge` does for Stellar. Privy only exposes wallets through its
 * hooks, so the provider has to be resolved during a render — that is why this
 * is a component and not a plain function.
 */
export function PrivyEvmBridge() {
  const privyConfigured = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID)
  const { ready, authenticated } = usePrivy()

  // Hooks must run unconditionally, so this stays mounted even without Privy and
  // simply resolves no wallets.
  const wallets = useWallets()

  useEffect(() => {
    if (!privyConfigured) {
      setEvmProvider(null)
      return
    }
    if (!ready || !authenticated) {
      useEvmWalletStore.getState().disconnect()
      setEvmProvider(null)
      return
    }

    let cancelled = false
    const evmWallet = wallets.wallets.find((wallet) => 'getEthereumProvider' in wallet)
    if (!evmWallet) {
      setEvmProvider(null)
      return
    }

    ;(evmWallet as unknown as { getEthereumProvider(): Promise<EvmProviderLike> })
      .getEthereumProvider()
      .then((provider) => {
        if (!cancelled) setEvmProvider(provider)
      })
      .catch(() => {
        if (!cancelled) setEvmProvider(null)
      })

    return () => {
      cancelled = true
    }
  }, [privyConfigured, ready, authenticated, wallets.wallets])

  // Reflect account and network changes made inside the wallet, so a switch to
  // another chain is caught rather than silently trading on the wrong network.
  useEvmWalletEvents()

  return null
}

'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DEFAULT_CHAIN, getArcConfig, type ActiveChain } from '../lib/arc'

/** ABI-shaped `0x` address. Kept local so this store needs no chain dependency. */
export type EvmAddress = `0x${string}`

/** Transport interface the SDK consumes, duplicated here to stay import-light. */
export interface EvmTransportLike {
  read<T = unknown>(args: {
    address: EvmAddress
    abi: readonly unknown[]
    functionName: string
    args?: readonly unknown[]
  }): Promise<T>
  write(args: {
    address: EvmAddress
    abi: readonly unknown[]
    functionName: string
    args?: readonly unknown[]
    value?: bigint
  }): Promise<`0x${string}`>
  account: EvmAddress | null
  chainId: number | null
  /** True when a wallet is attached and `write` can be attempted. */
  canWrite: boolean
}

export interface EvmWalletState {
  address: EvmAddress | null
  chainId: number | null
  isConnected: boolean
  isConnecting: boolean
  /** True when the wallet is on a chain other than the configured Arc network. */
  isWrongNetwork: boolean
  error: string | null
  transport: EvmTransportLike | null
  setConnecting: (isConnecting: boolean) => void
  setError: (error: string | null) => void
  setSnapshot: (snapshot: Partial<EvmWalletState>) => void
  disconnect: () => void
}

/**
 * EVM wallet state for Arc.
 *
 * Deliberately separate from the Stellar `useWalletStore`: the two chains hold
 * different accounts (G-addresses versus 0x-addresses) and have different notions
 * of a network, so one shared store would conflate them.
 */
export const useEvmWalletStore = create<EvmWalletState>()((set) => ({
  address: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  isWrongNetwork: false,
  error: null,
  transport: null,

  setConnecting: (isConnecting) => set({ isConnecting }),
  setError: (error) => set({ error }),
  setSnapshot: (snapshot) => set(snapshot),

  disconnect: () =>
    set({
      address: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      isWrongNetwork: false,
      error: null,
      transport: null,
    }),
}))

export interface ChainState {
  /** Which chain the app is currently pointed at. */
  activeChain: ActiveChain
  /** Chains that are actually configured; Arc only appears once its env is set. */
  availableChains: ActiveChain[]
  setActiveChain: (chain: ActiveChain) => void
}

/** Chains with real configuration behind them. Arc appears only when its env is set. */
export function availableChains(): ActiveChain[] {
  return getArcConfig().enabled ? ['stellar', 'arc'] : ['stellar']
}

/**
 * The chain the user last picked is remembered, but it is validated against what
 * is configured on reload: if Arc has never been configured we stay on Stellar
 * rather than pointing at a chain with no contracts behind it.
 */
export const useChainStore = create<ChainState>()(
  persist(
    (set, get) => ({
      activeChain: DEFAULT_CHAIN,
      availableChains: availableChains(),

      setActiveChain: (chain: ActiveChain) => {
        if (!get().availableChains.includes(chain)) return
        set({ activeChain: chain })
      },
    }),
    {
      name: 'forgex-active-chain',
      // Only the choice is persisted, never the derived configuration.
      partialize: (state) => ({ activeChain: state.activeChain }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const available = availableChains()
        state.availableChains = available
        state.activeChain = available.includes(state.activeChain) ? state.activeChain : DEFAULT_CHAIN
      },
    },
  ),
)

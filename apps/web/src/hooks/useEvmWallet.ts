'use client'

import { useCallback } from 'react'

import { getArcConfig } from '../lib/arc'
import { useEvmWalletStore, type EvmAddress, type EvmTransportLike } from './useEvmWalletStore'

export type Eip1193Request = (args: { method: string; params?: unknown[] | object }) => Promise<unknown>

export interface EvmProvider {
  request: Eip1193Request
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
}

/**
 * The wallet provider, set by `PrivyEvmBridge` while it renders and by the
 * caller of `connect` when no Privy wallet is available.
 */
let activeProvider: EvmProvider | null = null

export function setEvmProvider(provider: EvmProvider | null): void {
  activeProvider = provider
}

export function getEvmProvider(): EvmProvider | null {
  return activeProvider
}

const ARC_CHAIN_PARAMS: Record<number, {
  name: string
  rpcUrl: string
  explorerUrl: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
}> = {
  5042002: {
    name: 'Arc Testnet',
    rpcUrl: 'https://rpc.testnet.arc.io',
    explorerUrl: 'https://explorer.testnet.arc.io',
    nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 6 },
  },
  5042: {
    name: 'Arc',
    rpcUrl: 'https://rpc.mainnet.arc.io',
    explorerUrl: 'https://explorer.arc.io',
    nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 6 },
  },
}

/**
 * Switches the wallet to the Arc chain, adding the network when the wallet has
 * never seen it. Arc testnet is absent from the WalletConnect chain registry,
 * so the `wallet_addEthereumChain` fallback is the path most wallets take.
 */
export async function ensureArcChain(provider: EvmProvider, chainId: number): Promise<void> {
  const chain = ARC_CHAIN_PARAMS[chainId]
  if (!chain) throw new Error(`Chain ${chainId} is not an Arc network`)

  const hexChainId = `0x${chainId.toString(16)}`
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainId }] })
  } catch (error) {
    const code = (error as { code?: number }).code
    // 4902 (and some wallets' -32603) mean the chain is unknown and must be added.
    if (code !== 4902 && code !== -32603) throw error
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: hexChainId,
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: [chain.rpcUrl],
          blockExplorerUrls: [chain.explorerUrl],
        },
      ],
    })
  }
}

async function readWalletState(provider: EvmProvider): Promise<{ address: EvmAddress | null; chainId: number | null }> {
  const [accounts, chainId] = await Promise.all([
    provider.request({ method: 'eth_requestAccounts' }) as Promise<string[]>,
    provider.request({ method: 'eth_chainId' }) as Promise<string>,
  ])
  return {
    address: (accounts[0] as EvmAddress | undefined) ?? null,
    chainId: chainId ? Number(chainId) : null,
  }
}

/**
 * Builds the transport the SDK needs from an EIP-1193 provider. `viem` is loaded
 * on first use so that the trade components stay the only place it enters the
 * bundle, satisfying the layout memory budget in AGENTS.md.
 */
export async function buildEvmTransport(provider: EvmProvider): Promise<EvmTransportLike> {
  const viem = await import('viem')
  const transport_ = viem.custom(provider as unknown as Parameters<typeof viem.custom>[0])
  const readClient = viem.createPublicClient({ transport: transport_ })
  const writeClient = viem.createWalletClient({ transport: transport_ })

  const [addresses, chainId] = await Promise.all([
    writeClient.requestAddresses(),
    readClient.getChainId(),
  ])

  return {
    account: (addresses[0] as EvmAddress | undefined) ?? null,
    chainId,
    canWrite: true,
    read: <T = unknown>(args: Parameters<typeof readClient.readContract>[0]) =>
      readClient.readContract(args) as Promise<T>,
    write: (args) => writeClient.writeContract(args as Parameters<typeof writeClient.writeContract>[0]),
  }
}

/**
 * EVM wallet state and actions for Arc.
 *
 * Returns the store verbatim plus memoised `connect` / `switchChain` handlers,
 * so components can destructure what they need.
 */
export function useEvmWallet() {
  const connect = useCallback(async () => {
    const config = getArcConfig()
    const provider = activeProvider ?? fallbackProvider()

    if (!provider) {
      useEvmWalletStore.getState().setConnecting(false)
      useEvmWalletStore
        .getState()
        .setError('No EVM wallet found. Sign in with a wallet that supports Arc.')
      return
    }
    activeProvider = provider

    useEvmWalletStore.getState().setConnecting(true)
    useEvmWalletStore.getState().setError(null)
    try {
      await ensureArcChain(provider, config.chainId)
      const transport = await buildEvmTransport(provider)
      const { address, chainId } = await readWalletState(provider)
      useEvmWalletStore.getState().setSnapshot({
        address,
        chainId,
        isConnected: Boolean(address),
        isConnecting: false,
        isWrongNetwork: chainId !== config.chainId,
        error: null,
        transport,
      })
    } catch (err) {
      useEvmWalletStore.getState().setConnecting(false)
      useEvmWalletStore.getState().setError(err instanceof Error ? err.message : 'Failed to connect wallet')
    }
  }, [])

  const switchChain = useCallback(async () => {
    const provider = activeProvider ?? fallbackProvider()
    if (!provider) return
    const config = getArcConfig()
    try {
      await ensureArcChain(provider, config.chainId)
      const { chainId } = await readWalletState(provider)
      useEvmWalletStore.getState().setSnapshot({
        chainId,
        isWrongNetwork: chainId !== config.chainId,
        error: null,
      })
    } catch (err) {
      useEvmWalletStore.getState().setError(err instanceof Error ? err.message : 'Failed to switch network')
    }
  }, [])

  return { ...useEvmWalletStore(), connect, switchChain }
}

let eventsProvider: EvmProvider | null = null

/**
 * Keeps the store in sync when the user switches account or network inside their
 * wallet, so a trade cannot be sent against the wrong chain. Idempotent: the
 * subscription is made once per provider.
 */
export function useEvmWalletEvents(): void {
  const provider = activeProvider
  if (!provider || typeof provider.on !== 'function' || eventsProvider === provider) return
  eventsProvider = provider

  const onAccountsChanged = (...args: unknown[]) => {
    const accounts = args[0] as string[] | undefined
    if (!accounts || accounts.length === 0) {
      useEvmWalletStore.getState().disconnect()
      return
    }
    useEvmWalletStore.getState().setSnapshot({
      address: accounts[0] as EvmAddress,
      isConnected: true,
    })
  }

  const onChainChanged = (...args: unknown[]) => {
    const next = Number(args[0])
    useEvmWalletStore.getState().setSnapshot({
      chainId: next,
      isWrongNetwork: next !== getArcConfig().chainId,
    })
  }

  provider.on('accountsChanged', onAccountsChanged)
  provider.on('chainChanged', onChainChanged)
}

/** `window.ethereum`, for browsers with a wallet extension and no Privy login. */
function fallbackProvider(): EvmProvider | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { ethereum?: EvmProvider }).ethereum ?? null
}

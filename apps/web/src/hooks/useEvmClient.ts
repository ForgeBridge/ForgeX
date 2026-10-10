'use client'

import { useMemo } from 'react'

import { ForgeXEvmClient, type ArcChainId } from '@forgex/sdk-evm'

import { getArcConfig, type ArcConfig } from '../lib/arc'
import { useChainStore, useEvmWalletStore } from './useEvmWalletStore'

/**
 * A read-only client for the configured Arc factory.
 *
 * Reads go over the public RPC with no wallet involved, so the token feed and
 * the curve page work before anyone connects.
 */
export function useEvmReader(config: ArcConfig = getArcConfig()) {
  return useMemo(() => {
    if (!config.enabled || !config.factoryAddress) return null
    return {
      config,
      client: ForgeXEvmClient.withReadTransport(readTransportFromRpc(config.rpcUrl), config.factoryAddress),
    }
  }, [config])
}

/**
 * A read/write client once an EVM wallet is connected on the configured chain.
 * Returns null until then, which lets callers show a connect prompt instead of
 * attempting a transaction that cannot be signed.
 */
export function useEvmWriter(config: ArcConfig = getArcConfig()) {
  const transport = useEvmWalletStore((state) => state.transport)
  const isConnected = useEvmWalletStore((state) => state.isConnected)
  const chainId = useEvmWalletStore((state) => state.chainId)

  return useMemo(() => {
    if (!config.enabled || !config.factoryAddress) return null
    if (!transport || !isConnected) return null
    if (chainId !== config.chainId) return null
    return new ForgeXEvmClient(transport, config.factoryAddress)
  }, [config, transport, isConnected, chainId])
}

/** True when the app should render Arc affordances at all. */
export function useIsArcConfigured(): boolean {
  return useChainStore((state) => state.availableChains.includes('arc'))
}

/** True when Arc is the chain the user is currently on. */
export function useIsArcActive(): boolean {
  return useChainStore((state) => state.activeChain === 'arc')
}

/** Minimal JSON-RPC reader used until a wallet is connected. */
function readTransportFromRpc(rpcUrl: string) {
  return {
    read: async <T = unknown>(args: {
      address: `0x${string}`
      abi: readonly unknown[]
      functionName: string
      args?: readonly unknown[]
    }): Promise<T> => {
      // Built lazily so `viem` only loads when Arc is actually in use.
      const { encodeFunctionData, decodeFunctionResult } = await import('viem')
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [
            { to: args.address, data: encodeFunctionData(args as Parameters<typeof encodeFunctionData>[0]) },
            'latest',
          ],
        }),
      })
      const payload = (await response.json()) as { result?: string; error?: { message: string } }
      if (payload.error) throw new Error(payload.error.message)
      if (!payload.result) throw new Error('Arc RPC returned no data')
      return decodeFunctionResult({
        abi: args.abi as Parameters<typeof decodeFunctionResult>[0]['abi'],
        functionName: args.functionName,
        data: payload.result as `0x${string}`,
      }) as T
    },
  }
}

export type { ArcChainId }

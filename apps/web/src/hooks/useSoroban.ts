import { useMemo } from 'react'
import { ForgeXClient } from '@forgex/sdk'
import { getSorobanRpcUrl, getNetworkPassphrase } from '../lib/soroban'
import { useWalletStore } from './useWallet'

export function useSoroban() {
  const network = useWalletStore((state) => state.network)

  return useMemo(
    () =>
      new ForgeXClient({
        network,
        rpcUrl: getSorobanRpcUrl(network),
        networkPassphrase: getNetworkPassphrase(network),
      }),
    [network],
  )
}

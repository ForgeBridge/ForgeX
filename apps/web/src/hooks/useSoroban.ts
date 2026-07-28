import { useMemo } from 'react'
import { ForgeXClient } from '@forgex/sdk'
import { getSorobanRpcUrl } from '../lib/soroban'

export function useSoroban() {
  return useMemo(
    () =>
      new ForgeXClient({
        network: 'testnet',
        rpcUrl: getSorobanRpcUrl(),
      }),
    [],
  )
}

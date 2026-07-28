import { NETWORKS } from './constants'

export function getSorobanRpcUrl(): string {
  return NETWORKS.testnet.rpcUrl
}

export function getNetworkPassphrase(): string {
  return NETWORKS.testnet.networkPassphrase
}

import { NETWORKS, DEFAULT_NETWORK } from './constants'
import type { SupportedNetwork } from '../hooks/useWallet'

export function getSorobanRpcUrl(network: SupportedNetwork = DEFAULT_NETWORK): string {
  return NETWORKS[network]?.rpcUrl ?? NETWORKS.testnet.rpcUrl
}

export function getNetworkPassphrase(network: SupportedNetwork = DEFAULT_NETWORK): string {
  return NETWORKS[network]?.networkPassphrase ?? NETWORKS.testnet.networkPassphrase
}

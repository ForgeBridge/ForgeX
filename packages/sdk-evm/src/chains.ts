/** Arc (Circle) chain definitions shared by the app and the SDK. */

export const ARC_CHAIN_IDS = {
  arcTestnet: 5042002,
  arcMainnet: 5042,
} as const

export type ArcChainId = (typeof ARC_CHAIN_IDS)[keyof typeof ARC_CHAIN_IDS]

export interface ArcChainConfig {
  id: ArcChainId
  /** Human name shown in the wallet, the network badge and error copy. */
  name: string
  rpcUrl: string
  explorerUrl: string
  /** Arc charges gas in USDC, not in a volatile gas token. */
  nativeCurrency: { name: string; symbol: string; decimals: number }
  isTestnet: boolean
  faucetUrl?: string
}

export const ARC_CHAINS: Record<ArcChainId, ArcChainConfig> = {
  [ARC_CHAIN_IDS.arcTestnet]: {
    id: ARC_CHAIN_IDS.arcTestnet,
    name: 'Arc Testnet',
    rpcUrl: 'https://rpc.testnet.arc.io',
    explorerUrl: 'https://explorer.testnet.arc.io',
    nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 6 },
    isTestnet: true,
    faucetUrl: 'https://faucet.circle.com',
  },
  [ARC_CHAIN_IDS.arcMainnet]: {
    id: ARC_CHAIN_IDS.arcMainnet,
    name: 'Arc',
    rpcUrl: 'https://rpc.mainnet.arc.io',
    explorerUrl: 'https://explorer.arc.io',
    nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 6 },
    isTestnet: false,
  },
}

export function getArcChain(chainId: number): ArcChainConfig | undefined {
  return ARC_CHAINS[chainId as ArcChainId]
}

export function isArcChainId(chainId: number): chainId is ArcChainId {
  return chainId in ARC_CHAINS
}

/**
 * A wallet_addEthereumChain payload for the chain, for wallets that do not have Arc
 * in their registry. Arc testnet is absent from the WalletConnect chain list, so the
 * first connection has to teach the wallet.
 */
export function toWalletChainParam(chain: ArcChainConfig) {
  return {
    chainId: `0x${chain.id.toString(16)}`,
    chainName: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: [chain.rpcUrl],
    blockExplorerUrls: [chain.explorerUrl],
  }
}

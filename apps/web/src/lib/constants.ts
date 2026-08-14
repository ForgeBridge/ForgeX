export const NETWORKS = {
  testnet: {
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
  },
  mainnet: {
    rpcUrl: 'https://soroban.stellar.org',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
  },
} as const

export const DEFAULT_NETWORK = 'testnet'

// Public testnet deployment (see README). Used as fallback so the app works
// without env files; NEXT_PUBLIC_* overrides take precedence when set.
export const FACTORY_CONTRACT_ID =
  process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID ||
  'CBFMYDQDRJGOXYRKBDBBS2LQTAHHYYXUDAPGZVZJ2MEYJWHT3RGUSEJP'
export const BONDING_CURVE_CONTRACT_ID =
  process.env.NEXT_PUBLIC_BONDING_CURVE_CONTRACT_ID ||
  'CD7Q2RTRO7L2TC4WJSNVNONIWZFHVGAZGEXFI4INEK4QMEJ3JO3K4FRN'

export const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud'

export const STROOPS_PER_XLM = 10_000_000
export const SCALE = 10_000_000

export const CURVE_DEFAULTS = {
  initialPrice: BigInt(100),
  steepness: BigInt(1),
  reserveTarget: BigInt(500_000) * BigInt(STROOPS_PER_XLM),
}

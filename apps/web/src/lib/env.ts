import { DEFAULT_NETWORK, NETWORKS } from './constants'

export interface EnvConfig {
  network: 'testnet' | 'mainnet'
  rpcUrl: string
  networkPassphrase: string
  factoryContractId?: string
  bondingCurveContractId?: string
  ipfsGateway: string
}

export interface EnvValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  config: EnvConfig
  /** Arc (EVM) deployment status, always present, enabled only when configured. */
  arc: ArcEnvStatus
}

export function isValidUrl(url: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function isValidContractId(id?: string): boolean {
  if (!id) return false
  // Stellar/Soroban Contract ID: 56 alphanumeric characters starting with 'C'
  return /^C[A-Z0-9]{55}$/.test(id)
}

export function validateEnvConfig(env: Record<string, string | undefined> = process.env): EnvValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const rawNetwork = env.NEXT_PUBLIC_STELLAR_NETWORK || DEFAULT_NETWORK
  const network = rawNetwork === 'mainnet' ? 'mainnet' : 'testnet'

  if (rawNetwork !== 'testnet' && rawNetwork !== 'mainnet') {
    warnings.push(`Unknown network "${rawNetwork}". Defaulting to "${network}".`)
  }

  const defaultRpc = NETWORKS[network]?.rpcUrl || 'https://soroban-testnet.stellar.org'
  const rpcUrl = env.NEXT_PUBLIC_SOROBAN_RPC_URL || defaultRpc

  if (!isValidUrl(rpcUrl)) {
    errors.push(`Invalid Soroban RPC URL: "${rpcUrl}". Must be a valid HTTP(S) URL.`)
  }

  const networkPassphrase =
    env.NEXT_PUBLIC_STELLAR_PASSPHRASE ||
    NETWORKS[network]?.networkPassphrase ||
    'Test SDF Network ; September 2015'

  const factoryContractId = env.NEXT_PUBLIC_FACTORY_CONTRACT_ID?.trim()
  if (factoryContractId && !isValidContractId(factoryContractId)) {
    warnings.push(
      `NEXT_PUBLIC_FACTORY_CONTRACT_ID "${factoryContractId}" does not match standard 56-character Soroban contract ID format (C...).`
    )
  }

  const bondingCurveContractId = env.NEXT_PUBLIC_BONDING_CURVE_CONTRACT_ID?.trim()
  if (bondingCurveContractId && !isValidContractId(bondingCurveContractId)) {
    warnings.push(
      `NEXT_PUBLIC_BONDING_CURVE_CONTRACT_ID "${bondingCurveContractId}" does not match standard 56-character Soroban contract ID format (C...).`
    )
  }

  const ipfsGateway = env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud'
  if (!isValidUrl(ipfsGateway)) {
    warnings.push(`Invalid IPFS gateway URL "${ipfsGateway}". Falling back to default gateway.`)
  }

  const ipfsGatewaySafe = isValidUrl(ipfsGateway) ? ipfsGateway : 'https://gateway.pinata.cloud'

  const config: EnvConfig = {
    network,
    rpcUrl,
    networkPassphrase,
    factoryContractId,
    bondingCurveContractId,
    ipfsGateway: ipfsGatewaySafe,
  }

  // Arc is an optional second deployment. It is only reported when partially
  // configured, so a Stellar-only deployment stays silent.
  const arc = validateArcEnv(env, warnings)

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config,
    arc,
  }
}

/** The subset of Arc configuration the UI needs to decide what to render. */
export interface ArcEnvStatus {
  enabled: boolean
  chainId: number
  rpcUrl: string
  factoryAddress: `0x${string}` | null
  quoteToken: `0x${string}`
}

function isEvmAddress(value?: string): value is `0x${string}` {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value.trim())
}

function validateArcEnv(
  env: Record<string, string | undefined>,
  warnings: string[],
): ArcEnvStatus {
  const factoryAddress = env.NEXT_PUBLIC_ARC_FACTORY_ADDRESS?.trim()
  const rpcUrl = env.NEXT_PUBLIC_ARC_RPC_URL?.trim() || 'https://rpc.testnet.arc.io'
  const quoteToken = env.NEXT_PUBLIC_ARC_QUOTE_TOKEN_ADDRESS?.trim() || ZERO_ADDRESS
  const rawChainId = Number(env.NEXT_PUBLIC_ARC_CHAIN_ID)
  const chainId = Number.isInteger(rawChainId) && (rawChainId === 5042002 || rawChainId === 5042)
    ? rawChainId
    : 5042002

  if (!isValidUrl(rpcUrl)) {
    warnings.push(`Invalid Arc RPC URL: "${rpcUrl}". Arc will use the default endpoint.`)
  }

  if (factoryAddress && !isEvmAddress(factoryAddress)) {
    warnings.push(
      `NEXT_PUBLIC_ARC_FACTORY_ADDRESS "${factoryAddress}" is not a valid 0x address. Arc stays disabled.`,
    )
  }

  const parsedChainId = Number(env.NEXT_PUBLIC_ARC_CHAIN_ID)
  if (env.NEXT_PUBLIC_ARC_CHAIN_ID && parsedChainId !== chainId) {
    warnings.push(
      `NEXT_PUBLIC_ARC_CHAIN_ID "${env.NEXT_PUBLIC_ARC_CHAIN_ID}" is not an Arc chain (5042002 testnet, 5042 mainnet). Defaulting to testnet.`,
    )
  }

  if (!factoryAddress && hasAnyArcVar(env)) {
    warnings.push(
      'NEXT_PUBLIC_ARC_FACTORY_ADDRESS is unset, so Arc stays disabled. Set it to enable dual-chain support.',
    )
  }

  return {
    enabled: Boolean(isEvmAddress(factoryAddress)),
    chainId,
    rpcUrl,
    factoryAddress: isEvmAddress(factoryAddress) ? factoryAddress : null,
    quoteToken: (isEvmAddress(quoteToken) ? quoteToken : ZERO_ADDRESS) as `0x${string}`,
  }
}

function hasAnyArcVar(env: Record<string, string | undefined>): boolean {
  return Boolean(
    env.NEXT_PUBLIC_ARC_RPC_URL ||
      env.NEXT_PUBLIC_ARC_CHAIN_ID ||
      env.NEXT_PUBLIC_ARC_FACTORY_ADDRESS ||
      env.NEXT_PUBLIC_ARC_QUOTE_TOKEN_ADDRESS,
  )
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`

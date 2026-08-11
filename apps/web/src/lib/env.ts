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

  const config: EnvConfig = {
    network,
    rpcUrl,
    networkPassphrase,
    factoryContractId,
    bondingCurveContractId,
    ipfsGateway: isValidUrl(ipfsGateway) ? ipfsGateway : 'https://gateway.pinata.cloud',
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config,
  }
}

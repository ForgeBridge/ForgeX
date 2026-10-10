import {
  ARC_CHAINS,
  getArcChain,
  isArcChainId,
  type ArcChainConfig,
  type ArcChainId,
} from '@forgex/sdk-evm'

/**
 * Arc configuration, read from the environment.
 *
 * Arc is an *additional* deployment, not a replacement: when these variables are
 * unset the app stays exactly the Stellar-only app it was, and every function
 * here reports "not enabled".
 */

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

export interface ArcConfig {
  enabled: boolean
  chainId: ArcChainId
  rpcUrl: string
  factoryAddress: `0x${string}` | null
  quoteToken: `0x${string}`
  /** True when curves settle in the native Arc USDC gas token. */
  isNativeQuote: boolean
  chain: ArcChainConfig
  explorerUrl: string
}

export type ActiveChain = 'stellar' | 'arc'

export const DEFAULT_CHAIN: ActiveChain = 'stellar'

function env(key: string): string | undefined {
  const value = process.env[key]
  return value && value.length > 0 ? value : undefined
}

function parseAddress(value: string | undefined): `0x${string}` | null {
  if (!value) return null
  const trimmed = value.trim()
  return /^0x[0-9a-fA-F]{40}$/.test(trimmed) ? (trimmed as `0x${string}`) : null
}

function parseChainId(value: string | undefined): ArcChainId {
  const parsed = Number(value)
  // Only Arc chain ids are accepted, so a typo cannot silently target another EVM.
  // An unknown or absent value falls back to testnet, the conservative default.
  if (Number.isInteger(parsed) && isArcChainId(parsed)) return parsed
  return 5042002
}

/**
 * Reads the Arc configuration. Safe to call during render: it only touches
 * inlined `NEXT_PUBLIC_*` values, never secrets.
 */
export function getArcConfig(overrides: Partial<Record<string, string | undefined>> = {}): ArcConfig {
  const read = (key: string) => overrides[key] ?? env(key)

  const rpcUrl = read('NEXT_PUBLIC_ARC_RPC_URL') || 'https://rpc.testnet.arc.io'
  const chainId = parseChainId(read('NEXT_PUBLIC_ARC_CHAIN_ID'))
  const factoryAddress =
    parseAddress(read('NEXT_PUBLIC_ARC_FACTORY_ADDRESS')) ??
    parseAddress(read('NEXT_PUBLIC_FACTORY_ADDRESS'))
  const quoteToken = parseAddress(read('NEXT_PUBLIC_ARC_QUOTE_TOKEN_ADDRESS')) ?? ZERO_ADDRESS
  const chain = getArcChain(chainId) ?? ARC_CHAINS[5042002]

  return {
    enabled: Boolean(factoryAddress),
    chainId,
    rpcUrl,
    factoryAddress,
    quoteToken,
    isNativeQuote: quoteToken === ZERO_ADDRESS,
    chain,
    explorerUrl: chain.explorerUrl,
  }
}

/** True when both chains are usable, i.e. the chain switcher should be shown. */
export function isMultiChain(overrides: Partial<Record<string, string | undefined>> = {}): boolean {
  return getArcConfig(overrides).enabled
}

/** Formats an address as `0x1234…abcd` for the wallet button and badges. */
export function shortenAddress(address: string, lead = 6, tail = 4): string {
  if (address.length <= lead + tail + 1) return address
  return `${address.slice(0, lead)}…${address.slice(-tail)}`
}

export function arcExplorerAddressUrl(config: ArcConfig, address: string): string {
  return `${config.explorerUrl}/address/${address}`
}

export function arcExplorerTxUrl(config: ArcConfig, hash: string): string {
  return `${config.explorerUrl}/tx/${hash}`
}

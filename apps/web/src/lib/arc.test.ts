import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import {
  DEFAULT_CHAIN,
  arcExplorerAddressUrl,
  arcExplorerTxUrl,
  getArcConfig,
  isMultiChain,
  shortenAddress,
} from './arc'

const ADDRESS = '0x1111111111111111111111111111111111111111'

describe('getArcConfig', () => {
  const original = { ...process.env }

  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    process.env = { ...original }
  })

  it('is disabled when the factory address is not configured', () => {
    const config = getArcConfig({})
    expect(config.enabled).toBe(false)
    expect(config.factoryAddress).toBeNull()
    expect(config.chainId).toBe(5042002)
    expect(config.chain.name).toBe('Arc Testnet')
    expect(config.isNativeQuote).toBe(true)
  })

  it('is enabled once a factory address is set', () => {
    const config = getArcConfig({ NEXT_PUBLIC_ARC_FACTORY_ADDRESS: ADDRESS })
    expect(config.enabled).toBe(true)
    expect(config.factoryAddress).toBe(ADDRESS)
    expect(isMultiChain({ NEXT_PUBLIC_ARC_FACTORY_ADDRESS: ADDRESS })).toBe(true)
  })

  it('reads the configured chain id and returns its chain metadata', () => {
    const config = getArcConfig({
      NEXT_PUBLIC_ARC_FACTORY_ADDRESS: ADDRESS,
      NEXT_PUBLIC_ARC_CHAIN_ID: '5042',
    })
    expect(config.chainId).toBe(5042)
    expect(config.chain.name).toBe('Arc')
    expect(config.chain.isTestnet).toBe(false)
    expect(config.explorerUrl).toBe('https://explorer.arc.io')
  })

  it('falls back to testnet for an unknown chain id rather than guessing', () => {
    const config = getArcConfig({
      NEXT_PUBLIC_ARC_FACTORY_ADDRESS: ADDRESS,
      NEXT_PUBLIC_ARC_CHAIN_ID: '1',
    })
    expect(config.chainId).toBe(5042002)
  })

  it('falls back to testnet for a non-numeric chain id', () => {
    const config = getArcConfig({
      NEXT_PUBLIC_ARC_FACTORY_ADDRESS: ADDRESS,
      NEXT_PUBLIC_ARC_CHAIN_ID: 'not-a-number',
    })
    expect(config.chainId).toBe(5042002)
  })

  it('rejects a malformed factory address so a typo disables Arc instead of pointing at garbage', () => {
    const config = getArcConfig({ NEXT_PUBLIC_ARC_FACTORY_ADDRESS: '0xnope' })
    expect(config.enabled).toBe(false)
    expect(config.factoryAddress).toBeNull()
  })

  it('treats the zero quote token as the native gas token', () => {
    const config = getArcConfig({
      NEXT_PUBLIC_ARC_FACTORY_ADDRESS: ADDRESS,
      NEXT_PUBLIC_ARC_QUOTE_TOKEN_ADDRESS: '0x0000000000000000000000000000000000000000',
    })
    expect(config.isNativeQuote).toBe(true)
  })

  it('treats an ERC20 quote token as not native', () => {
    const config = getArcConfig({
      NEXT_PUBLIC_ARC_FACTORY_ADDRESS: ADDRESS,
      NEXT_PUBLIC_ARC_QUOTE_TOKEN_ADDRESS: ADDRESS,
    })
    expect(config.isNativeQuote).toBe(false)
    expect(config.quoteToken).toBe(ADDRESS)
  })

  it('ignores a malformed quote token so the app cannot send funds to a typo', () => {
    const config = getArcConfig({
      NEXT_PUBLIC_ARC_FACTORY_ADDRESS: ADDRESS,
      NEXT_PUBLIC_ARC_QUOTE_TOKEN_ADDRESS: 'nonsense',
    })
    expect(config.quoteToken).toBe('0x0000000000000000000000000000000000000000')
  })
})

describe('address helpers', () => {
  it('shortens addresses for display', () => {
    expect(shortenAddress(ADDRESS)).toBe('0x1111…1111')
  })

  it('leaves short strings alone', () => {
    expect(shortenAddress('0x1234')).toBe('0x1234')
  })

  it('builds explorer links', () => {
    const config = getArcConfig({ NEXT_PUBLIC_ARC_FACTORY_ADDRESS: ADDRESS })
    expect(arcExplorerAddressUrl(config, ADDRESS)).toBe(
      'https://explorer.testnet.arc.io/address/' + ADDRESS,
    )
    expect(arcExplorerTxUrl(config, '0xabc')).toBe('https://explorer.testnet.arc.io/tx/0xabc')
  })
})

describe('DEFAULT_CHAIN', () => {
  it('stays on Stellar so an unconfigured deployment is unchanged', () => {
    expect(DEFAULT_CHAIN).toBe('stellar')
  })
})

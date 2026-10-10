import { describe, expect, it, vi } from 'vitest'
import type { Abi, Address } from 'viem'

import { CurveClient, ForgeXEvmClient, isNativeQuote } from './client'
import type { EvmReadTransport, EvmTransport } from './transport'
import { ARC_CHAINS, getArcChain, isArcChainId, toWalletChainParam } from './chains'
import type { CreateTokenParams } from './types'

const FACTORY: Address = '0x1111111111111111111111111111111111111111'
const CURVE: Address = '0x2222222222222222222222222222222222222222'
const TOKEN: Address = '0x3333333333333333333333333333333333333333'

const tokenInfoRow = [
  TOKEN,
  CURVE,
  '0x4444444444444444444444444444444444444444',
  'ForgeX Demo',
  'FDEMO',
  7n,
  1_000_000_000_000_000n,
  '',
  'A demo token',
  1_700_000_000n,
] as const

const curveInfoRow = [
  TOKEN,
  100n,
  1n,
  5_000_000_000_000n,
  1_005n,
  1_000n,
  10_100_501n,
  10_100_501n,
  '0x4444444444444444444444444444444444444444',
  0n,
  (1n << 127n) - 1n,
  false,
  0n,
] as const

interface ReadCall {
  functionName: string
  args?: readonly unknown[]
}

function makeReadTransport(handler: (call: ReadCall) => unknown): EvmReadTransport {
  return {
    read: vi.fn(async (args) => {
      if (args.functionName === 'get_curve_info') {
        return handler({ functionName: args.functionName }) ?? curveInfoRow
      }
      if (args.functionName === 'get_all_tokens' || args.functionName === 'get_tokens_paginated') {
        return [tokenInfoRow]
      }
      return handler({ functionName: args.functionName, args: args.args })
    }) as EvmReadTransport['read'],
  }
}

function makeTransport(handler: (call: ReadCall) => unknown): EvmTransport & { writes: unknown[] } {
  const reads = makeReadTransport(handler)
  const writes: unknown[] = []
  const transport = {
    account: CURVE,
    chainId: 5042002,
    canWrite: true,
    read: reads.read,
    write: vi.fn(async (args) => {
      writes.push(args)
      return '0xdeadbeef'
    }),
    writes,
  }
  return transport as unknown as EvmTransport & { writes: unknown[] }
}

describe('chains', () => {
  it('knows both Arc networks with USDC as the gas token', () => {
    expect(ARC_CHAINS[5042002].name).toBe('Arc Testnet')
    expect(ARC_CHAINS[5042].name).toBe('Arc')
    expect(ARC_CHAINS[5042].nativeCurrency).toEqual({ name: 'USD Coin', symbol: 'USDC', decimals: 6 })
  })

  it('rejects chain ids it does not know, so a wallet on another network is detected', () => {
    expect(isArcChainId(5042002)).toBe(true)
    expect(isArcChainId(1)).toBe(false)
    expect(getArcChain(1)).toBeUndefined()
  })

  it('produces a wallet_addEthereumChain payload Arc testnet needs', () => {
    const param = toWalletChainParam(ARC_CHAINS[5042002])
    expect(param.chainId).toBe('0x4cef52')
    expect(param.rpcUrls).toEqual(['https://rpc.testnet.arc.io'])
    expect(param.blockExplorerUrls).toEqual(['https://explorer.testnet.arc.io'])
  })
})

describe('CurveClient', () => {
  it('decodes the curve info struct into typed fields', async () => {
    const transport = makeReadTransport(() => curveInfoRow)
    const curve = new CurveClient(transport, CURVE)
    const info = await curve.getCurveInfo()

    expect(info.token_id).toBe(TOKEN)
    expect(info.reserve).toBe(1_005n)
    expect(info.tokens_sold).toBe(1_000n)
    expect(info.price).toBe(10_100_501n)
    expect(info.graduated).toBe(false)
  })

  it('quotes a buy as the amount the buyer will owe', async () => {
    const transport = makeReadTransport((call) => (call.functionName === 'quote_buy' ? 1_015n : undefined))
    const curve = new CurveClient(transport, CURVE)
    expect(await curve.quoteBuy(1_000n)).toBe(1_015n)
  })

  it('quotes a sell as the net the seller receives', async () => {
    const transport = makeReadTransport((call) => (call.functionName === 'quote_sell' ? 990n : undefined))
    const curve = new CurveClient(transport, CURVE)
    expect(await curve.quoteSell(1_000n)).toBe(990n)
  })

  it('attaches value only when the curve settles in the native gas token', async () => {
    const transport = makeTransport(() => curveInfoRow)
    const curve = new CurveClient(transport, CURVE)

    curve.buy(1_000n, 1_015n, 0n, '0x0000000000000000000000000000000000000000')
    expect((transport.writes[0] as { value?: bigint }).value).toBe(1_015n)

    transport.writes.length = 0
    curve.buy(1_000n, 1_015n, 0n, TOKEN)
    expect((transport.writes[0] as { value?: bigint }).value).toBeUndefined()
  })

  it('passes the buy arguments in the contract argument order', async () => {
    const transport = makeTransport(() => curveInfoRow)
    const curve = new CurveClient(transport, CURVE)
    await curve.buy(1_000n, 1_015n, 1_700_000_000n, TOKEN)
    const call = transport.writes[0] as { functionName: string; args: readonly unknown[] }
    expect(call.functionName).toBe('buy')
    expect(call.args).toEqual([1_000n, 1_015n, 1_700_000_000n])
  })

  it('passes the sell arguments in the contract argument order', async () => {
    const transport = makeTransport(() => curveInfoRow)
    const curve = new CurveClient(transport, CURVE)
    await curve.sell(500n, 490n, 1_700_000_000n)
    const call = transport.writes[0] as { functionName: string; args: readonly unknown[] }
    expect(call.functionName).toBe('sell')
    expect(call.args).toEqual([500n, 490n, 1_700_000_000n])
  })

  it('reads the allowance the owner granted the curve over a quote asset', async () => {
    const transport = makeReadTransport((call) =>
      call.functionName === 'allowance' ? 500n : undefined,
    )
    const curve = new CurveClient(transport, CURVE)
    expect(await curve.quoteAllowance(CURVE, TOKEN)).toBe(500n)
  })
})

describe('FactoryClient', () => {
  it('decodes registry rows into typed records', async () => {
    const transport = makeReadTransport(() => [tokenInfoRow])
    const client = ForgeXEvmClient.withReadTransport(transport, FACTORY)
    const all = await client.factory().getAllTokens()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ name: 'ForgeX Demo', symbol: 'FDEMO', decimals: 7, created_at: 1_700_000_000n })
  })

  it('paginates with the offset and limit forwarded to the contract', async () => {
    const transport = makeReadTransport(() => [tokenInfoRow])
    const client = ForgeXEvmClient.withReadTransport(transport, FACTORY)
    await client.factory().getTokensPaginated(2n, 10n)
    expect(transport.read).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'get_tokens_paginated', args: [2n, 10n] }),
    )
  })

  it('encodes createToken parameters in the struct field order', async () => {
    const transport = makeTransport(() => [tokenInfoRow])
    const client = new ForgeXEvmClient(transport, FACTORY)
    const params: CreateTokenParams = {
      name: 'ForgeX Demo',
      symbol: 'FDEMO',
      decimals: 7,
      max_supply: 1_000_000_000_000_000n,
      image_uri: '',
      description: '',
      initial_price: 100n,
      steepness: 1n,
      reserve_target: 5_000_000_000_000n,
    }
    await client.factory().createToken(params)
    const call = transport.writes[0] as { functionName: string; args: readonly unknown[] }
    expect(call.functionName).toBe('create_token')
    expect(call.args[0]).toEqual([
      'ForgeX Demo',
      'FDEMO',
      7,
      1_000_000_000_000_000n,
      '',
      '',
      100n,
      1n,
      5_000_000_000_000n,
    ])
  })
})

describe('isNativeQuote', () => {
  it('detects the zero address as the native gas token', () => {
    expect(isNativeQuote('0x0000000000000000000000000000000000000000')).toBe(true)
    expect(isNativeQuote(TOKEN)).toBe(false)
  })
})

// A read-only client must fail loudly rather than send a transaction with no wallet.
describe('read-only clients', () => {
  it('refuses writes with an actionable error', async () => {
    const transport = makeReadTransport(() => undefined)
    const client = ForgeXEvmClient.withReadTransport(transport, FACTORY)
    expect(client.account).toBeNull()
    await expect(client.factory().createToken({} as CreateTokenParams)).rejects.toThrow(/read-only/i)
  })
})

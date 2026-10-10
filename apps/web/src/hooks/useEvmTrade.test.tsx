import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { ForgeXEvmClient } from '@forgex/sdk-evm'

import { useEvmBuy, useEvmSell } from './useEvmTrade'
import { useEvmWalletStore } from './useEvmWalletStore'

const CURVE = '0x2222222222222222222222222222222222222222' as const
const USDC = '0x3333333333333333333333333333333333333333' as const

/** Minimal transport stand-in: the trade hooks only check that one exists. */
const FAKE_TRANSPORT = {
  account: '0x4444444444444444444444444444444444444444' as const,
  chainId: 5042002,
  canWrite: true,
  read: async <T = unknown>(): Promise<T> => undefined as unknown as T,
  write: async () => '0x0' as `0x${string}`,
}

function makeClient(overrides: {
  quoteBuy?: bigint
  quoteSell?: bigint
  quoteToken?: string
  allowance?: bigint
  buy?: Promise<string>
  sell?: Promise<string>
  approve?: Promise<string>
}) {
  const store = {
    quoteBuyCalls: [] as bigint[],
    allowanceCalls: 0,
    buyCalls: [] as unknown[],
    approveCalls: [] as unknown[],
    sellCalls: [] as unknown[],
  }

  const curve = {
    quoteBuy: vi.fn(async (amount: bigint) => {
      store.quoteBuyCalls.push(amount)
      return overrides.quoteBuy ?? 1_015n
    }),
    quoteSell: vi.fn(async () => overrides.quoteSell ?? 990n),
    quoteToken: vi.fn(async () => overrides.quoteToken ?? USDC),
    quoteAllowance: vi.fn(async () => {
      store.allowanceCalls += 1
      return overrides.allowance ?? 0n
    }),
    buy: vi.fn(async (...args: unknown[]) => {
      store.buyCalls.push(args)
      return (await overrides.buy) ?? '0xbuy'
    }),
    sell: vi.fn(async (...args: unknown[]) => {
      store.sellCalls.push(args)
      return (await overrides.sell) ?? '0xsell'
    }),
  }

  const token = {
    approve: vi.fn(async (...args: unknown[]) => {
      store.approveCalls.push(args)
      return (await overrides.approve) ?? '0xapprove'
    }),
  }

  const client = {
    curve: () => curve,
    token: () => token,
  } as unknown as ForgeXEvmClient

  return { client, curve, token, store }
}

describe('useEvmBuy', () => {
  beforeEach(() => {
    useEvmWalletStore.getState().disconnect()
    vi.stubEnv('NEXT_PUBLIC_ARC_QUOTE_TOKEN_ADDRESS', USDC)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('refuses to trade with no wallet connected', async () => {
    const { client } = makeClient({})
    const { result } = renderHook(() => useEvmBuy(null, CURVE))

    await act(async () => {
      expect(await result.current.buy({ amountTokens: '1000', decimals: 7, slippagePercent: 1 })).toBeNull()
    })

    expect(result.current.error).toMatch(/Connect a wallet/i)
    void client
  })

  it('approves the curve before buying when an ERC20 quote needs it', async () => {
    useEvmWalletStore.getState().setSnapshot({
      address: '0x4444444444444444444444444444444444444444',
      isConnected: true,
      transport: FAKE_TRANSPORT,
    })
    const { client, store } = makeClient({ quoteBuy: 1_015n, allowance: 0n })

    const { result } = renderHook(() => useEvmBuy(client, CURVE))
    await act(async () => {
      await result.current.buy({ amountTokens: '1000', decimals: 7, slippagePercent: 1 })
    })

    expect(store.approveCalls.length).toBe(1)
    expect(store.buyCalls.length).toBe(1)
  })

  it('skips the approval when the allowance already covers the quote', async () => {
    useEvmWalletStore.getState().setSnapshot({
      address: '0x4444444444444444444444444444444444444444',
      isConnected: true,
      transport: FAKE_TRANSPORT,
    })
    const { client, store } = makeClient({ quoteBuy: 1_015n, allowance: 2_000n })

    const { result } = renderHook(() => useEvmBuy(client, CURVE))
    await act(async () => {
      await result.current.buy({ amountTokens: '1000', decimals: 7, slippagePercent: 1 })
    })

    expect(store.approveCalls.length).toBe(0)
    expect(store.allowanceCalls).toBeGreaterThan(0)
    expect(store.buyCalls.length).toBe(1)
  })

  it('widens maxCost by the slippage limit', async () => {
    useEvmWalletStore.getState().setSnapshot({
      address: '0x4444444444444444444444444444444444444444',
      isConnected: true,
      transport: FAKE_TRANSPORT,
    })
    const { client, store } = makeClient({ quoteBuy: 1_000n, allowance: 10_000n })

    const { result } = renderHook(() => useEvmBuy(client, CURVE))
    await act(async () => {
      await result.current.buy({ amountTokens: '1000', decimals: 7, slippagePercent: 2 })
    })

    const [, maxCost] = store.buyCalls[0] as [unknown, bigint, unknown]
    expect(maxCost).toBe(1_020n)
  })

  it('uses the exact quote as value for a native-quote curve, with no approval', async () => {
    vi.stubEnv('NEXT_PUBLIC_ARC_QUOTE_TOKEN_ADDRESS', '0x0000000000000000000000000000000000000000')
    useEvmWalletStore.getState().setSnapshot({
      address: '0x4444444444444444444444444444444444444444',
      isConnected: true,
      transport: FAKE_TRANSPORT,
    })
    const { client, store } = makeClient({ quoteBuy: 1_015n, quoteToken: '0x0000000000000000000000000000000000000000' })

    const { result } = renderHook(() => useEvmBuy(client, CURVE))
    await act(async () => {
      await result.current.buy({ amountTokens: '1000', decimals: 7, slippagePercent: 1 })
    })

    expect(store.approveCalls.length).toBe(0)
    const [amountOut, maxCost, deadline, quoteToken] = store.buyCalls[0] as [bigint, bigint, bigint, string]
    expect(amountOut).toBe(10_000_000_000n)
    expect(maxCost).toBe(1_025n)
    expect(quoteToken).toBe('0x0000000000000000000000000000000000000000')
    expect(deadline).toBeGreaterThan(0n)
  })

  it('reports a friendly message when the wallet rejects', async () => {
    useEvmWalletStore.getState().setSnapshot({
      address: '0x4444444444444444444444444444444444444444',
      isConnected: true,
      transport: FAKE_TRANSPORT,
    })
    const { client } = makeClient({
      allowance: 10_000n,
      buy: Promise.reject(new Error('User rejected the request')),
    })

    const { result } = renderHook(() => useEvmBuy(client, CURVE))
    await act(async () => {
      await result.current.buy({ amountTokens: '1000', decimals: 7, slippagePercent: 1 })
    })

    expect(result.current.error).toMatch(/rejected/i)
    expect(result.current.error).not.toMatch(/User rejected/)
  })

  it('reports a slippage failure distinctly from a rejection', async () => {
    useEvmWalletStore.getState().setSnapshot({
      address: '0x4444444444444444444444444444444444444444',
      isConnected: true,
      transport: FAKE_TRANSPORT,
    })
    const { client } = makeClient({
      allowance: 10_000n,
      buy: Promise.reject(new Error('execution reverted: SlippageExceeded()')),
    })

    const { result } = renderHook(() => useEvmBuy(client, CURVE))
    await act(async () => {
      await result.current.buy({ amountTokens: '1000', decimals: 7, slippagePercent: 1 })
    })

    expect(result.current.error).toMatch(/price moved/i)
  })
})

describe('useEvmSell', () => {
  beforeEach(() => {
    useEvmWalletStore.getState().disconnect()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('narrows minPayout by the slippage limit', async () => {
    useEvmWalletStore.getState().setSnapshot({
      address: '0x4444444444444444444444444444444444444444',
      isConnected: true,
      transport: FAKE_TRANSPORT,
    })
    const { client, store } = makeClient({ quoteSell: 1_000n })

    const { result } = renderHook(() => useEvmSell(client, CURVE))
    await act(async () => {
      await result.current.sell({ amountTokens: '1000', decimals: 7, slippagePercent: 2 })
    })

    const [, minPayout] = store.sellCalls[0] as [unknown, bigint, unknown]
    expect(minPayout).toBe(980n)
  })

  it('passes the token amount in base units and a future deadline', async () => {
    useEvmWalletStore.getState().setSnapshot({
      address: '0x4444444444444444444444444444444444444444',
      isConnected: true,
      transport: FAKE_TRANSPORT,
    })
    const { client, store } = makeClient({ quoteSell: 990n })

    const { result } = renderHook(() => useEvmSell(client, CURVE))
    await act(async () => {
      await result.current.sell({ amountTokens: '500', decimals: 7, slippagePercent: 1 })
    })

    const [amountIn, , deadline] = store.sellCalls[0] as [bigint, bigint, bigint]
    expect(amountIn).toBe(5_000_000_000n)
    expect(deadline).toBeGreaterThan(BigInt(Math.floor(Date.now() / 1000)))
  })

  it('returns the transaction hash on success', async () => {
    useEvmWalletStore.getState().setSnapshot({
      address: '0x4444444444444444444444444444444444444444',
      isConnected: true,
      transport: FAKE_TRANSPORT,
    })
    const { client } = makeClient({ sell: Promise.resolve('0xdead') })

    const { result } = renderHook(() => useEvmSell(client, CURVE))
    let hash: string | null = null
    await act(async () => {
      hash = await result.current.sell({ amountTokens: '500', decimals: 7, slippagePercent: 1 })
    })

    expect(hash).toBe('0xdead')
    expect(result.current.txHash).toBe('0xdead')
    expect(result.current.error).toBeNull()
  })
})

import { decodeFunctionResult, encodeFunctionData, type Abi, type Address } from 'viem'

import factoryAbi from './abi/ForgeXFactory.json'
import curveAbi from './abi/ForgeXCurve.json'
import tokenAbi from './abi/ForgeXToken.json'

import type { CreateTokenParams, CurveInfo, TokenInfo } from './types'
import type { EvmReadTransport, EvmWriteTransport } from './transport'

export const FACTORY_ABI = factoryAbi as unknown as Abi
export const CURVE_ABI = curveAbi as unknown as Abi
export const TOKEN_ABI = tokenAbi as unknown as Abi

export const erc20Abi = [
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const satisfies Abi

export interface EvmTransport {
  read<T = unknown>(args: {
    address: Address
    abi: Abi
    functionName: string
    args?: readonly unknown[]
  }): Promise<T>
  write(args: {
    address: Address
    abi: Abi
    functionName: string
    args?: readonly unknown[]
    value?: bigint
  }): Promise<`0x${string}`>
  readonly account: Address | null
  readonly chainId: number | null
  /** True when `write` is available, i.e. a wallet is connected. */
  readonly canWrite: boolean
}

export type { EvmReadTransport, EvmWriteTransport }

/**
 * Nexus for the Arc deployment: one entry point for every ForgeX contract,
 * backed by an injected transport so the app can hand in a viem wallet client
 * and tests can hand in a fake.
 */
export class ForgeXEvmClient {
  constructor(
    private readonly transport: EvmTransport,
    private readonly factoryAddress: Address,
  ) {}

  static withReadTransport(transport: EvmReadTransport, factoryAddress: Address): ForgeXEvmClient {
    return new ForgeXEvmClient(asReadOnlyTransport(transport), factoryAddress)
  }

  get account(): Address | null {
    return this.transport.account
  }

  factory(): FactoryClient {
    return new FactoryClient(this.transport, this.factoryAddress)
  }

  curve(curveAddress: Address): CurveClient {
    return new CurveClient(this.transport, curveAddress)
  }

  token(tokenAddress: Address): TokenClient {
    return new TokenClient(this.transport, tokenAddress)
  }

  /** The registered token and its curve, for the token detail page. */
  async getTokenRecord(tokenAddress: Address) {
    const factory = this.factory()
    const [info, exists] = await Promise.all([factory.getToken(tokenAddress), factory.hasToken(tokenAddress)])
    if (!exists) return null
    return info
  }
}

export class FactoryClient {
  constructor(
    private readonly transport: EvmTransport,
    private readonly address: Address,
  ) {}

  getAdmin(): Promise<Address> {
    return this.transport.read({ address: this.address, abi: FACTORY_ABI, functionName: 'get_admin' })
  }

  tokenCount(): Promise<bigint> {
    return this.transport.read({ address: this.address, abi: FACTORY_ABI, functionName: 'token_count' })
  }

  deployNonce(): Promise<bigint> {
    return this.transport.read({ address: this.address, abi: FACTORY_ABI, functionName: 'deploy_nonce' })
  }

  quoteToken(): Promise<Address> {
    return this.transport.read({ address: this.address, abi: FACTORY_ABI, functionName: 'quote_token' })
  }

  async getAllTokens(): Promise<TokenInfo[]> {
    const rows = (await this.transport.read({
      address: this.address,
      abi: FACTORY_ABI,
      functionName: 'get_all_tokens',
    })) as readonly unknown[]
    return rows.map(decodeTokenInfo)
  }

  async getTokensPaginated(offset: bigint, limit: bigint): Promise<TokenInfo[]> {
    const rows = (await this.transport.read({
      address: this.address,
      abi: FACTORY_ABI,
      functionName: 'get_tokens_paginated',
      args: [offset, limit],
    })) as readonly unknown[]
    return rows.map(decodeTokenInfo)
  }

  async getToken(tokenAddress: Address): Promise<TokenInfo> {
    const row = await this.transport.read({
      address: this.address,
      abi: FACTORY_ABI,
      functionName: 'get_token',
      args: [tokenAddress],
    })
    return decodeTokenInfo(row)
  }

  getTokenByName(name: string): Promise<Address> {
    return this.transport.read({
      address: this.address,
      abi: FACTORY_ABI,
      functionName: 'get_token_by_name',
      args: [name],
    })
  }

  getTokenBySymbol(symbol: string): Promise<Address> {
    return this.transport.read({
      address: this.address,
      abi: FACTORY_ABI,
      functionName: 'get_token_by_symbol',
      args: [symbol],
    })
  }

  hasToken(tokenAddress: Address): Promise<boolean> {
    return this.transport.read({
      address: this.address,
      abi: FACTORY_ABI,
      functionName: 'has_token',
      args: [tokenAddress],
    })
  }

  hasName(name: string): Promise<boolean> {
    return this.transport.read({
      address: this.address,
      abi: FACTORY_ABI,
      functionName: 'has_name',
      args: [name],
    })
  }

  hasSymbol(symbol: string): Promise<boolean> {
    return this.transport.read({
      address: this.address,
      abi: FACTORY_ABI,
      functionName: 'has_symbol',
      args: [symbol],
    })
  }

  /** Forges a token plus its curve; `msg.sender` is the creator and the admin. */
  async createToken(params: CreateTokenParams): Promise<`0x${string}`> {
    return this.transport.write({
      address: this.address,
      abi: FACTORY_ABI,
      functionName: 'create_token',
      args: [encodeCreateTokenParams(params)],
    })
  }
}

export class CurveClient {
  constructor(
    private readonly transport: EvmTransport,
    private readonly address: Address,
  ) {}

  async getCurveInfo(): Promise<CurveInfo> {
    const raw = await this.transport.read({
      address: this.address,
      abi: CURVE_ABI,
      functionName: 'get_curve_info',
    })
    return decodeCurveInfo(raw)
  }

  getPrice(): Promise<bigint> {
    return this.transport.read({
      address: this.address,
      abi: CURVE_ABI,
      functionName: 'get_price',
    })
  }

  getReserve(): Promise<bigint> {
    return this.transport.read({ address: this.address, abi: CURVE_ABI, functionName: 'get_reserve' })
  }

  getTokensSold(): Promise<bigint> {
    return this.transport.read({ address: this.address, abi: CURVE_ABI, functionName: 'get_tokens_sold' })
  }

  getAdminFees(): Promise<bigint> {
    return this.transport.read({ address: this.address, abi: CURVE_ABI, functionName: 'get_admin_fees' })
  }

  isGraduated(): Promise<boolean> {
    return this.transport.read({ address: this.address, abi: CURVE_ABI, functionName: 'is_graduated' })
  }

  getFeeRate(): Promise<bigint> {
    return this.transport.read({ address: this.address, abi: CURVE_ABI, functionName: 'get_fee_rate' })
  }

  getCap(): Promise<bigint> {
    return this.transport.read({ address: this.address, abi: CURVE_ABI, functionName: 'get_cap' })
  }

  token(): Promise<Address> {
    return this.transport.read({ address: this.address, abi: CURVE_ABI, functionName: 'token' })
  }

  quoteToken(): Promise<Address> {
    return this.transport.read({ address: this.address, abi: CURVE_ABI, functionName: 'quote_token' })
  }

  /** What the buyer would owe for `amountOut`, fees included. */
  quoteBuy(amountOut: bigint): Promise<bigint> {
    return this.transport.read({
      address: this.address,
      abi: CURVE_ABI,
      functionName: 'quote_buy',
      args: [amountOut],
    })
  }

  /** What the seller would receive for `amountIn`, fees deducted. */
  quoteSell(amountIn: bigint): Promise<bigint> {
    return this.transport.read({
      address: this.address,
      abi: CURVE_ABI,
      functionName: 'quote_sell',
      args: [amountIn],
    })
  }

  /**
   * Buys `amountOut`, paying `maxCost` at most. When the curve settles in an ERC20
   * quote the caller must have approved the curve for at least `owed`.
   *
   * `value` is attached automatically for a native-quote curve.
   */
  async buy(
    amountOut: bigint,
    maxCost: bigint,
    deadline: bigint,
    quoteToken: Address,
  ): Promise<`0x${string}`> {
    return this.transport.write({
      address: this.address,
      abi: CURVE_ABI,
      functionName: 'buy',
      args: [amountOut, maxCost, deadline],
      value: isNativeQuote(quoteToken) ? maxCost : undefined,
    })
  }

  async sell(amountIn: bigint, minPayout: bigint, deadline: bigint): Promise<`0x${string}`> {
    return this.transport.write({
      address: this.address,
      abi: CURVE_ABI,
      functionName: 'sell',
      args: [amountIn, minPayout, deadline],
    })
  }

  async withdrawFees(recipient: Address): Promise<`0x${string}`> {
    return this.transport.write({
      address: this.address,
      abi: CURVE_ABI,
      functionName: 'withdraw_fees',
      args: [recipient],
    })
  }

  /** Allowance `owner` has granted this curve over a quote asset. */
  quoteAllowance(owner: Address, quoteToken: Address): Promise<bigint> {
    return this.transport.read({
      address: quoteToken,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [owner, this.address],
    })
  }
}

export class TokenClient {
  constructor(
    private readonly transport: EvmTransport,
    private readonly address: Address,
  ) {}

  name(): Promise<string> {
    return this.transport.read({ address: this.address, abi: TOKEN_ABI, functionName: 'name' })
  }

  symbol(): Promise<string> {
    return this.transport.read({ address: this.address, abi: TOKEN_ABI, functionName: 'symbol' })
  }

  decimals(): Promise<number> {
    return this.transport.read({ address: this.address, abi: TOKEN_ABI, functionName: 'decimals' })
  }

  maxSupply(): Promise<bigint> {
    return this.transport.read({ address: this.address, abi: TOKEN_ABI, functionName: 'max_supply' })
  }

  totalSupply(): Promise<bigint> {
    return this.transport.read({ address: this.address, abi: TOKEN_ABI, functionName: 'totalSupply' })
  }

  balanceOf(account: Address): Promise<bigint> {
    return this.transport.read({
      address: this.address,
      abi: TOKEN_ABI,
      functionName: 'balanceOf',
      args: [account],
    })
  }

  async approve(spender: Address, amount: bigint): Promise<`0x${string}`> {
    return this.transport.write({
      address: this.address,
      abi: TOKEN_ABI,
      functionName: 'approve',
      args: [spender, amount],
    })
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Quote asset `0x0` means the curve settles in the native Arc USDC gas token. */
export function isNativeQuote(quoteToken: Address): boolean {
  return /^0x0{40}$/.test(quoteToken)
}

/**
 * Wraps a read-only transport so the write path fails loudly with a useful message
 * instead of attempting a transaction without a wallet.
 */
export function asReadOnlyTransport(transport: EvmReadTransport): EvmTransport {
  return {
    account: null,
    chainId: null,
    canWrite: false,
    read: (args) => transport.read(args),
    write: () => {
      throw new Error('This ForgeX client is read-only. Connect a wallet to write.')
    },
  }
}

function encodeCreateTokenParams(params: CreateTokenParams): readonly unknown[] {
  return [
    params.name,
    params.symbol,
    params.decimals,
    params.max_supply,
    params.image_uri,
    params.description,
    params.initial_price,
    params.steepness,
    params.reserve_target,
  ]
}

function decodeTokenInfo(row: unknown): TokenInfo {
  const [token_id, curve_id, creator, name, symbol, decimals, max_supply, image_uri, description, created_at] =
    row as readonly [`0x${string}`, `0x${string}`, `0x${string}`, string, string, bigint, bigint, string, string, bigint]
  return {
    token_id,
    curve_id,
    creator,
    name,
    symbol,
    decimals: Number(decimals),
    max_supply,
    image_uri,
    description,
    created_at,
  }
}

function decodeCurveInfo(raw: unknown): CurveInfo {
  const [
    token_id,
    initial_price,
    steepness,
    reserve_target,
    reserve,
    tokens_sold,
    price,
    market_cap,
    admin,
    fee_rate,
    cap,
    graduated,
    admin_fees,
  ] = raw as readonly [
    `0x${string}`,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    `0x${string}`,
    bigint,
    bigint,
    boolean,
    bigint,
  ]
  return {
    token_id,
    initial_price,
    steepness,
    reserve_target,
    reserve,
    tokens_sold,
    price,
    market_cap,
    admin,
    fee_rate,
    cap,
    graduated,
    admin_fees,
  }
}

/** Encodes a contract call without sending it, for wallets that need calldata. */
export function encodeCall(args: {
  address: Address
  abi: Abi
  functionName: string
  args?: readonly unknown[]
}): `0x${string}` {
  return encodeFunctionData(args as Parameters<typeof encodeFunctionData>[0])
}

/** Decodes a return value, useful when a wallet returns raw hex. */
export function decodeResult(args: {
  abi: Abi
  functionName: string
  data: `0x${string}`
}): unknown {
  return decodeFunctionResult(args as Parameters<typeof decodeFunctionResult>[0])
}

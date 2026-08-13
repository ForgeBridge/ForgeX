import { scValToNative, xdr } from '@stellar/stellar-sdk'

import type { InvokeOptions, ReadOptions, SorobanClient } from '../client'
import { address, i128, u64, vec } from '../abi'
import type { CurveInfo, CurveParams } from '../types/curve'

export class BondingCurveClient {
  constructor(
    private client: SorobanClient,
    private contractId: string,
  ) {}

  async initialize(
    tokenId: string,
    curveParams: CurveParams,
    admin: string,
    options: InvokeOptions,
  ): Promise<void> {
    await this.invoke(
      'initialize',
      [address(tokenId), this.encodeCurveParams(curveParams), address(admin)],
      options,
    )
  }

  async buy(
    buyer: string,
    amountOut: string,
    maxCost: string,
    deadline: number | bigint,
    options: InvokeOptions,
  ): Promise<string> {
    const result = await this.invoke(
      'buy',
      [address(buyer), i128(amountOut), i128(maxCost), u64(deadline)],
      options,
    )
    return this.retvalAmount(result.retval)
  }

  async sell(
    seller: string,
    amountIn: string,
    minPayout: string,
    deadline: number | bigint,
    options: InvokeOptions,
  ): Promise<string> {
    const result = await this.invoke(
      'sell',
      [address(seller), i128(amountIn), i128(minPayout), u64(deadline)],
      options,
    )
    return this.retvalAmount(result.retval)
  }

  async getPrice(options: ReadOptions = {}): Promise<string> {
    const retval = await this.read('get_price', [], options)
    return this.retvalAmount(retval)
  }

  async getReserve(options: ReadOptions = {}): Promise<string> {
    const retval = await this.read('get_reserve', [], options)
    return this.retvalAmount(retval)
  }

  async getTokensSold(options: ReadOptions = {}): Promise<string> {
    const retval = await this.read('get_tokens_sold', [], options)
    return this.retvalAmount(retval)
  }

  async getMarketCap(options: ReadOptions = {}): Promise<string> {
    const retval = await this.read('get_market_cap', [], options)
    return this.retvalAmount(retval)
  }

  async getCurveInfo(options: ReadOptions = {}): Promise<CurveInfo> {
    const retval = await this.read('get_curve_info', [], options)
    return retval ? this.decodeCurveInfo(scValToNative(retval) as unknown[]) : this.emptyCurveInfo()
  }

  getContractId(): string {
    return this.contractId
  }

  private encodeCurveParams(params: CurveParams): xdr.ScVal {
    return vec([
      i128(params.initial_price),
      i128(params.steepness),
      i128(params.reserve_target),
    ])
  }

  private decodeCurveInfo(native: unknown[]): CurveInfo {
    const params = native[1] as unknown[]
    return {
      token_id: String(native[0]),
      params: {
        initial_price: String(params[0]),
        steepness: String(params[1]),
        reserve_target: String(params[2]),
      },
      reserve: String(native[2]),
      tokens_sold: String(native[3]),
      price: String(native[4]),
      market_cap: String(native[5]),
      admin: String(native[6]),
    }
  }

  private emptyCurveInfo(): CurveInfo {
    return {
      token_id: '',
      params: { initial_price: '0', steepness: '0', reserve_target: '0' },
      reserve: '0',
      tokens_sold: '0',
      price: '0',
      market_cap: '0',
      admin: '',
    }
  }

  private retvalAmount(retval?: xdr.ScVal): string {
    if (!retval) {
      return '0'
    }
    return scValToNative(retval).toString()
  }

  private read(
    method: string,
    args: xdr.ScVal[],
    options: ReadOptions = {},
  ): Promise<xdr.ScVal | undefined> {
    return this.client.read(this.contractId, method, args, options)
  }

  private invoke(
    method: string,
    args: xdr.ScVal[],
    options: InvokeOptions,
  ): Promise<{ retval?: xdr.ScVal }> {
    return this.client.invoke(this.contractId, method, args, options)
  }
}
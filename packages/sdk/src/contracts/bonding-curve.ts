import { Address, nativeToScVal, scValToNative, xdr } from '@stellar/stellar-sdk'
import type { SorobanClient } from '../client'
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
  ): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'initialize', [
      new Address(tokenId).toScVal(),
      this.encodeCurveParams(curveParams),
      new Address(admin).toScVal(),
    ])
    return String(scValToNative(result as xdr.ScVal))
  }

  async buy(buyer: string, amountOut: string): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'buy', [
      new Address(buyer).toScVal(),
      nativeToScVal(BigInt(amountOut), { type: 'i128' }),
    ])
    return String(scValToNative(result as xdr.ScVal))
  }

  async sell(seller: string, amountIn: string): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'sell', [
      new Address(seller).toScVal(),
      nativeToScVal(BigInt(amountIn), { type: 'i128' }),
    ])
    return String(scValToNative(result as xdr.ScVal))
  }

  async getPrice(): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'get_price', [])
    return String(scValToNative(result as xdr.ScVal))
  }

  async getReserve(): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'get_reserve', [])
    return String(scValToNative(result as xdr.ScVal))
  }

  async getTokensSold(): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'get_tokens_sold', [])
    return String(scValToNative(result as xdr.ScVal))
  }

  async getMarketCap(): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'get_market_cap', [])
    return String(scValToNative(result as xdr.ScVal))
  }

  async getCurveInfo(): Promise<CurveInfo> {
    const result = await this.client.invokeContract(this.contractId, 'get_curve_info', [])
    return scValToNative(result as xdr.ScVal) as CurveInfo
  }

  private encodeCurveParams(params: CurveParams): xdr.ScVal {
    return nativeToScVal(
      {
        initial_price: BigInt(params.initial_price),
        steepness: BigInt(params.steepness),
        reserve_target: BigInt(params.reserve_target),
      },
      { type: 'struct' } as unknown as { type: 'i128' },
    )
  }
}

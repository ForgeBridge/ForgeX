import { Address, nativeToScVal, scValToNative } from '@stellar/stellar-sdk'
import { SorobanClient } from '../client'
import { CurveInfo, CurveParams } from '../types/curve'

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
    return this.client.invokeContract(this.contractId, 'initialize', [
      new Address(tokenId).toScVal(),
      this.encodeCurveParams(curveParams),
      new Address(admin).toScVal(),
    ])
  }

  async buy(buyer: string, amountOut: string): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'buy', [
      new Address(buyer).toScVal(),
      nativeToScVal(BigInt(amountOut), true),
    ])
    return String(scValToNative(result))
  }

  async sell(seller: string, amountIn: string): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'sell', [
      new Address(seller).toScVal(),
      nativeToScVal(BigInt(amountIn), true),
    ])
    return String(scValToNative(result))
  }

  async getPrice(): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'get_price', [])
    return String(scValToNative(result))
  }

  async getReserve(): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'get_reserve', [])
    return String(scValToNative(result))
  }

  async getTokensSold(): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'get_tokens_sold', [])
    return String(scValToNative(result))
  }

  async getMarketCap(): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'get_market_cap', [])
    return String(scValToNative(result))
  }

  async getCurveInfo(): Promise<CurveInfo> {
    const result = await this.client.invokeContract(this.contractId, 'get_curve_info', [])
    return scValToNative(result) as CurveInfo
  }

  private encodeCurveParams(params: CurveParams): ReturnType<typeof nativeToScVal> {
    return nativeToScVal(
      {
        initial_price: BigInt(params.initial_price),
        steepness: BigInt(params.steepness),
        reserve_target: BigInt(params.reserve_target),
      },
      true,
    )
  }
}

import { Address, nativeToScVal, scValToNative, xdr } from '@stellar/stellar-sdk'
import { SorobanClient } from '../client'
import { CreateTokenParams, TokenInfo } from '../types/token'
import { CurveParams } from '../types/curve'

export class FactoryClient {
  constructor(
    private client: SorobanClient,
    private contractId: string,
  ) {}

  async initialize(admin: string): Promise<string> {
    return this.client.invokeContract(this.contractId, 'initialize', [
      new Address(admin).toScVal(),
    ])
  }

  async createToken(params: CreateTokenParams): Promise<{ token_id: string; curve_id: string }> {
    const result = await this.client.invokeContract(this.contractId, 'create_token', [
      this.encodeCreateTokenParams(params),
    ])
    const vals = result as xdr.ScVal[]
    return {
      token_id: scValToNative(vals[0]) as string,
      curve_id: scValToNative(vals[1]) as string,
    }
  }

  async getAllTokens(): Promise<TokenInfo[]> {
    const result = await this.client.invokeContract(this.contractId, 'get_all_tokens', [])
    return scValToNative(result) as TokenInfo[]
  }

  async getToken(tokenId: string): Promise<TokenInfo> {
    const result = await this.client.invokeContract(this.contractId, 'get_token', [
      new Address(tokenId).toScVal(),
    ])
    return scValToNative(result) as TokenInfo
  }

  async getTokenCount(): Promise<number> {
    const result = await this.client.invokeContract(this.contractId, 'get_token_count', [])
    return Number(scValToNative(result))
  }

  private encodeCreateTokenParams(params: CreateTokenParams): xdr.ScVal {
    return nativeToScVal(
      {
        name: params.name,
        symbol: params.symbol,
        decimals: params.decimals,
        max_supply: BigInt(params.max_supply),
        image_uri: params.image_uri,
        description: params.description,
        curve_params: {
          initial_price: BigInt(params.curve_params.initial_price),
          steepness: BigInt(params.curve_params.steepness),
          reserve_target: BigInt(params.curve_params.reserve_target),
        },
      },
      true,
    )
  }
}

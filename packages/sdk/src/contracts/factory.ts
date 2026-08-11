import { Address, nativeToScVal, scValToNative, xdr } from '@stellar/stellar-sdk'
import type { SorobanClient } from '../client'
import type { CreateTokenParams, TokenInfo } from '../types/token'

export class FactoryClient {
  constructor(
    private client: SorobanClient,
    private contractId: string,
  ) {}

  async initialize(admin: string): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'initialize', [
      new Address(admin).toScVal(),
    ])
    return String(scValToNative(result as xdr.ScVal))
  }

  async createToken(params: CreateTokenParams): Promise<{ token_id: string; curve_id: string }> {
    const result = await this.client.invokeContract(this.contractId, 'create_token', [
      this.encodeCreateTokenParams(params),
    ])
    const native = scValToNative(result as xdr.ScVal) as { token_id: string; curve_id: string }
    return native
  }

  async getAllTokens(): Promise<TokenInfo[]> {
    const result = await this.client.invokeContract(this.contractId, 'get_all_tokens', [])
    return scValToNative(result as xdr.ScVal) as TokenInfo[]
  }

  async getToken(tokenId: string): Promise<TokenInfo> {
    const result = await this.client.invokeContract(this.contractId, 'get_token', [
      new Address(tokenId).toScVal(),
    ])
    return scValToNative(result as xdr.ScVal) as TokenInfo
  }

  async getTokenCount(): Promise<number> {
    const result = await this.client.invokeContract(this.contractId, 'get_token_count', [])
    return Number(scValToNative(result as xdr.ScVal))
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
      { type: 'struct' } as unknown as { type: 'i128' },
    )
  }
}

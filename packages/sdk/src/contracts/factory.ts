import { scValToNative, xdr } from '@stellar/stellar-sdk'

import type { InvokeOptions, ReadOptions, SorobanClient } from '../client'
import { address, i128, u32, u64, vec } from '../abi'
import type { CreateTokenParams, TokenInfo } from '../types/token'
import type { CurveParams } from '../types/curve'

export class FactoryClient {
  constructor(
    private client: SorobanClient,
    private contractId: string,
  ) {}

  async initialize(
    admin: string,
    options: InvokeOptions,
  ): Promise<void> {
    await this.invoke('initialize', [address(admin)], options)
  }

  async createToken(
    params: CreateTokenParams,
    options: InvokeOptions,
  ): Promise<{ tokenId: string; curveId: string }> {
    const result = await this.invoke(
      'create_token',
      [this.encodeCreateTokenParams(params)],
      options,
    )
    const native = result.retval
      ? (scValToNative(result.retval) as unknown[])
      : []
    return {
      tokenId: String(native[0]),
      curveId: String(native[1]),
    }
  }

  async getAllTokens(options: ReadOptions = {}): Promise<TokenInfo[]> {
    const retval = await this.read('get_all_tokens', [], options)
    if (!retval || retval.switch() === xdr.ScValType.scvVoid()) {
      return []
    }
    return (scValToNative(retval) as unknown[][]).map((row) =>
      this.decodeTokenInfo(row),
    )
  }

  async getToken(
    tokenId: string,
    options: ReadOptions = {},
  ): Promise<TokenInfo> {
    const retval = await this.read('get_token', [address(tokenId)], options)
    return retval ? this.decodeTokenInfo(scValToNative(retval) as unknown[]) : this.emptyTokenInfo()
  }

  async getTokenCount(options: ReadOptions = {}): Promise<string> {
    const retval = await this.read('get_token_count', [], options)
    return retval ? scValToNative(retval).toString() : '0'
  }

  async getTokensPaginated(
    offset: number | bigint,
    limit: number | bigint,
    options: ReadOptions = {},
  ): Promise<TokenInfo[]> {
    const retval = await this.read(
      'get_tokens_paginated',
      [u64(offset), u64(limit)],
      options,
    )
    if (!retval || retval.switch() === xdr.ScValType.scvVoid()) {
      return []
    }
    return (scValToNative(retval) as unknown[][]).map((row) =>
      this.decodeTokenInfo(row),
    )
  }

  getContractId(): string {
    return this.contractId
  }

  private encodeCreateTokenParams(params: CreateTokenParams): xdr.ScVal {
    return vec([
      address(params.token_id),
      address(params.curve_id),
      xdr.ScVal.scvString(params.name),
      xdr.ScVal.scvString(params.symbol),
      u32(params.decimals),
      i128(params.max_supply),
      xdr.ScVal.scvString(params.image_uri),
      xdr.ScVal.scvString(params.description),
      this.encodeCurveParams(params.curve_params),
    ])
  }

  private encodeCurveParams(params: CurveParams): xdr.ScVal {
    return vec([
      i128(params.initial_price),
      i128(params.steepness),
      i128(params.reserve_target),
    ])
  }

  private decodeTokenInfo(native: unknown[]): TokenInfo {
    return {
      token_id: String(native[0]),
      curve_id: String(native[1]),
      creator: String(native[2]),
      name: String(native[3]),
      symbol: String(native[4]),
      decimals: Number(native[5]),
      max_supply: String(native[6]),
      image_uri: String(native[7]),
      description: String(native[8]),
      created_at: Number(native[9]),
    }
  }

  private emptyTokenInfo(): TokenInfo {
    return {
      token_id: '',
      curve_id: '',
      creator: '',
      name: '',
      symbol: '',
      decimals: 0,
      max_supply: '0',
      image_uri: '',
      description: '',
      created_at: 0,
    }
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
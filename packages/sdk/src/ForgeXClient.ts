import { SorobanClient } from './client'
import type { ForgeXNetwork, InvokeOptions, ReadOptions, SorobanClientConfig } from './client'
import { TokenClient } from './contracts/token'
import { FactoryClient } from './contracts/factory'
import { BondingCurveClient } from './contracts/bonding-curve'
import type { TokenInfo } from './types/token'
import type { CreateTokenParams } from './types/token'

export interface ForgeXClientConfig {
  network: ForgeXNetwork
  rpcUrl: string
  networkPassphrase?: string
  allowHttp?: boolean
}

export class ForgeXClient {
  private readonly client: SorobanClient

  constructor(config: ForgeXClientConfig) {
    this.client = new SorobanClient(config)
  }

  /** Low-level Soroban RPC client used by all typed contract clients. */
  get soroban(): SorobanClient {
    return this.client
  }

  get networkPassphrase(): string {
    return this.client.networkPassphrase
  }

  get rpcUrl(): string {
    return this.client.rpcUrl
  }

  token(contractId: string): TokenClient {
    return new TokenClient(this.client, contractId)
  }

  factory(contractId: string): FactoryClient {
    return new FactoryClient(this.client, contractId)
  }

  bondingCurve(contractId: string): BondingCurveClient {
    return new BondingCurveClient(this.client, contractId)
  }

  /** Highest convenience: create a token through the factory in one call. */
  async createToken(
    factoryId: string,
    params: CreateTokenParams,
    options: InvokeOptions,
  ): Promise<{ tokenId: string; curveId: string }> {
    return this.factory(factoryId).createToken(params, options)
  }

  /** Highest convenience: fetch a registered token's public record. */
  async getTokenInfo(
    factoryId: string,
    tokenId: string,
    options?: ReadOptions,
  ): Promise<TokenInfo> {
    return this.factory(factoryId).getToken(tokenId, options)
  }

  async getLatestLedger(): Promise<number> {
    return this.client.getLatestLedger()
  }
}

export type { SorobanClientConfig as ForgeXClientFullConfig }
export { SorobanClient }
export type { ForgeXNetwork, InvokeOptions, ReadOptions }
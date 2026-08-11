import {
  Networks,
  xdr,
} from '@stellar/stellar-sdk'

export type ForgeXNetwork = 'testnet' | 'mainnet'

export interface SorobanClientConfig {
  network: ForgeXNetwork
  rpcUrl: string
  networkPassphrase?: string
}

export interface InvokeOptions {
  signTransaction: (xdrTx: string) => Promise<string>
  sourceAccount: string
}

export interface ReadOptions {
  /** Optional abort signal for cancellation */
  signal?: AbortSignal
}

export class SorobanClient {
  readonly rpcUrl: string
  readonly networkPassphrase: string

  constructor(config: SorobanClientConfig) {
    this.rpcUrl = config.rpcUrl
    this.networkPassphrase =
      config.networkPassphrase ??
      (config.network === 'testnet'
        ? Networks.TESTNET
        : Networks.PUBLIC)
  }

  async invokeContract(
    contractId: string,
    method: string,
    args: xdr.ScVal[],
    _options?: InvokeOptions,
  ): Promise<xdr.ScVal | xdr.ScVal[]> {
    // This is a placeholder implementation for the SDK.
    // Real invocation requires Soroban RPC interaction.
    throw new Error(
      `invokeContract not yet wired: ${contractId}.${method} with ${args.length} args`,
    )
  }

  async getLatestLedger(): Promise<number> {
    // Placeholder — requires Soroban RPC
    throw new Error('getLatestLedger not yet wired')
  }
}

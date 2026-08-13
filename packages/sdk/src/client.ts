import {
  AssembledTransaction,
  ContractClient,
  networks as sorobanNetworks,
} from '@stellar/soroban-client'
import {
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  BASE_FEE,
  xdr,
} from '@stellar/stellar-sdk'

export type ForgeXNetwork = 'testnet' | 'mainnet'

export interface SorobanClientConfig {
  network: ForgeXNetwork
  rpcUrl: string
  networkPassphrase?: string
  allowHttp?: boolean
}

export interface InvokeOptions {
  fee?: number
  timeoutInSeconds?: number
}

export interface ReadOptions {
  ledgerKey?: any
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
  private rpcUrl: string
  private networkPassphrase: string

  constructor(config: SorobanClientConfig) {
    this.rpcUrl = config.rpcUrl
    this.allowHttp = config.allowHttp ?? true
    this.networkPassphrase =
      config.networkPassphrase ??
      (config.network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC)
  }

  async getLatestLedger(): Promise<number> {
    const { Server } = await import('@stellar/stellar-sdk/rpc')
    const server = new Server(this.rpcUrl, { allowHttp: this.allowHttp })
    const info = await server.getLatestLedger()
    return info.sequence
  }

  async invokeContract(
    contractId: string,
    method: string,
    args: xdr.ScVal[],
  ): Promise<xdr.ScVal | xdr.ScVal[]> {
    const { Server } = await import('@stellar/stellar-sdk/rpc')
    const server = new Server(this.rpcUrl, { allowHttp: true })

    const account = await server.getAccount(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    )

    const contract = new ContractClient({
      contractId,
      networkPassphrase: this.networkPassphrase,
      rpcUrl: this.rpcUrl,
    })

    const tx = await contract.from(method, ...args)
    const result = await tx.signAndSend({
      signTransaction: async (txn: string) => txn,
    })
    return result
  }
}

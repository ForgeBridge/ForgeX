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

export interface ForgeXClientConfig {
  network: 'testnet' | 'mainnet'
  rpcUrl: string
  networkPassphrase?: string
}

export class SorobanClient {
  private rpcUrl: string
  private networkPassphrase: string

  constructor(config: ForgeXClientConfig) {
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

import {
  Account,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk'

import type { Transaction } from '@stellar/stellar-sdk'

const NULL_ACCOUNT = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'

export type ForgeXNetwork = 'testnet' | 'mainnet'

export interface SorobanClientConfig {
  network: ForgeXNetwork
  rpcUrl: string
  networkPassphrase?: string
  allowHttp?: boolean
  /** Override the RPC backend (used by tests and alternate RPC adapters). */
  rpc?: Pick<
    SorobanRpc.Server,
    | 'getAccount'
    | 'getLatestLedger'
    | 'simulateTransaction'
    | 'sendTransaction'
    | 'getTransaction'
    | 'getNetwork'
  >
}

export type TransactionSigner = Keypair | ((envelopeXdr: string) => Promise<string>)

export interface InvokeOptions {
  /** Stellar account address that submits (and where possible signs) the call. */
  sourceAccount: string
  signers: TransactionSigner[]
  /** How long to wait for the transaction to settle, in seconds. */
  timeoutSeconds?: number
}

export interface ReadOptions {
  sourceAccount?: string
}

export interface InvokeResult {
  hash: string
  status: SorobanRpc.Api.GetTransactionStatus
  retval?: xdr.ScVal
  error?: string
}

export class SorobanClient {
  readonly network: ForgeXNetwork
  readonly rpcUrl: string
  readonly networkPassphrase: string
  readonly allowHttp: boolean
  private readonly rpcOverride?: SorobanClientConfig['rpc']

  private server?: SorobanRpc.Server

  constructor(config: SorobanClientConfig) {
    this.validateConfig(config)
    this.network = config.network
    this.rpcUrl = config.rpcUrl
    this.allowHttp = config.allowHttp ?? this.network === 'testnet'
    this.rpcOverride = config.rpc
    this.networkPassphrase =
      config.networkPassphrase ??
      (this.network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC)
  }

  get rpc(): NonNullable<SorobanClientConfig['rpc']> {
    if (this.rpcOverride) {
      return this.rpcOverride
    }
    if (!this.server) {
      this.server = new SorobanRpc.Server(this.rpcUrl, {
        allowHttp: this.allowHttp,
      })
    }
    return this.server
  }

  private validateConfig(config: SorobanClientConfig): void {
    if (config.network !== 'testnet' && config.network !== 'mainnet') {
      throw new Error(`invalid network: ${String(config.network)}`)
    }
    if (!config.rpcUrl || !config.rpcUrl.startsWith('http')) {
      throw new Error('rpcUrl must be an http(s) endpoint')
    }
  }

  async getLatestLedger(): Promise<number> {
    const resp = await this.rpc.getLatestLedger()
    return resp.sequence
  }

  async getAccount(address: string): Promise<Account> {
    return this.rpc.getAccount(address)
  }

  /**
   * Simulates a read-only contract call and returns the decoded return value.
   * Never submits a transaction.
   */
  async read(
    contractId: string,
    method: string,
    args: xdr.ScVal[],
    options: ReadOptions = {},
  ): Promise<xdr.ScVal | undefined> {
    const source = options.sourceAccount ?? NULL_ACCOUNT
    const account = new Account(source, '0')
    const tx = this.buildTransaction(account, contractId, method, args)
    const simulation = await this.rpc.simulateTransaction(tx)
    if (SorobanRpc.Api.isSimulationError(simulation)) {
      throw new Error(`simulation failed: ${simulation.error}`)
    }
    return simulation.result?.retval
  }

  /**
   * Runs a contract call end to end: build -> simulate -> assemble auth ->
   * sign -> submit -> wait for settlement. Returns the final status and the
   * simulated return value.
   */
  async invoke(
    contractId: string,
    method: string,
    args: xdr.ScVal[],
    options: InvokeOptions,
  ): Promise<InvokeResult> {
    const deadline = this.responseDeadline(options.timeoutSeconds)
    const account = await this.rpc.getAccount(options.sourceAccount)
    const raw = this.buildTransaction(account, contractId, method, args)

    const simulation = await this.rpc.simulateTransaction(raw)
    if (SorobanRpc.Api.isSimulationError(simulation)) {
      throw new Error(`simulation failed: ${simulation.error}`)
    }
    const simulatedRetval = simulation.result?.retval

    const prepared = SorobanRpc.assembleTransaction(raw, simulation).build()
    const signed = await this.signTransaction(prepared, options.signers)

    const sent = await this.rpc.sendTransaction(signed)
    if (sent.status === 'ERROR') {
      return {
        hash: sent.hash,
        status: SorobanRpc.Api.GetTransactionStatus.FAILED,
        error: sent.errorResult?.result()?.switch().name,
      }
    }

    while (Date.now() < deadline) {
      const receipt = await this.rpc.getTransaction(sent.hash)
      const status = receipt.status
      if (status !== SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
        const result = this.resultFromReceipt(receipt, sent.hash)
        if (!result.retval && simulatedRetval) {
          result.retval = simulatedRetval
        }
        return result
      }
      await sleep(this.pollIntervalSeconds * 1000)
    }

    throw new Error(`timed out waiting for transaction ${sent.hash}`)
  }

  protected buildTransaction(
    account: Account,
    contractId: string,
    method: string,
    args: xdr.ScVal[],
  ): Transaction {
    const contract = new Contract(contractId)
    return new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .setTimeout(30)
      .addOperation(contract.call(method, ...args))
      .build()
  }

  private async signTransaction(
    tx: Transaction,
    signers: TransactionSigner[],
  ): Promise<Transaction> {
    if (signers.length === 0) {
      throw new Error('at least one signer is required')
    }

    let result = tx
    for (const signer of signers) {
      if (typeof signer === 'function') {
        const fn = signer as (envelopeXdr: string) => Promise<string>
        const signedEnvelope = await fn(result.toXDR())
        const parsed = TransactionBuilder.fromXDR(
          signedEnvelope,
          this.networkPassphrase,
        )
        result = parsed as Transaction
      } else {
        result.sign(signer)
      }
    }
    return result
  }

  private resultFromReceipt(
    receipt: SorobanRpc.Api.GetTransactionResponse,
    hash: string,
  ): InvokeResult {
    const base: InvokeResult = { hash, status: receipt.status }

    if (receipt.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      const successReceipt =
        receipt as SorobanRpc.Api.GetSuccessfulTransactionResponse
      if (successReceipt.returnValue) {
        base.retval = successReceipt.returnValue
      }
      return base
    }

    if (receipt.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      const failedReceipt =
        receipt as SorobanRpc.Api.GetFailedTransactionResponse
      base.error = failedReceipt.resultXdr.result().switch().name
    }
    return base
  }

  private responseDeadline(timeoutSeconds?: number): number {
    const timeout = timeoutSeconds ?? this.defaultTimeoutSeconds
    return Date.now() + timeout * 1000
  }

  protected get defaultTimeoutSeconds(): number {
    return 60
  }

  protected get pollIntervalSeconds(): number {
    return 1
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
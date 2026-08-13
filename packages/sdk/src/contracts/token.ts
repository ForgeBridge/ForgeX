import { scValToNative, xdr } from '@stellar/stellar-sdk'

import type { InvokeOptions, ReadOptions, SorobanClient } from '../client'
import { address, bool, bytes, i128, u32, u64, vec } from '../abi'
import { InterfaceVersion, TokenMetadata } from '../types/token'

export class TokenClient {
  constructor(
    private client: SorobanClient,
    private contractId: string,
  ) {}

  static constructorArgs(params: {
    admin: string
    name: string
    symbol: string
    decimals: number
    max_supply: string
  }): xdr.ScVal[] {
    return [
      address(params.admin),
      xdr.ScVal.scvString(params.name),
      xdr.ScVal.scvString(params.symbol),
      u32(params.decimals),
      i128(params.max_supply),
    ]
  }

  async version(options: ReadOptions = {}): Promise<InterfaceVersion> {
    const retval = await this.readValue('version', [], options)
    return scValToNative(retval) as InterfaceVersion
  }

  async upgrade(newWasmHash: Uint8Array | string, options: InvokeOptions): Promise<void> {
    const hash =
      typeof newWasmHash === 'string'
        ? Uint8Array.from(Buffer.from(newWasmHash, 'hex'))
        : newWasmHash
    await this.invoke('upgrade', [bytes(hash)], options)
  }

  async mint(to: string, amount: string, options: InvokeOptions): Promise<string> {
    const result = await this.invoke('mint', [address(to), i128(amount)], options)
    return this.retvalAmount(result.retval)
  }

  async burn(from: string, amount: string, options: InvokeOptions): Promise<string> {
    const result = await this.invoke('burn', [address(from), i128(amount)], options)
    return this.retvalAmount(result.retval)
  }

  async transfer(from: string, to: string, amount: string, options: InvokeOptions): Promise<string> {
    const result = await this.invoke(
      'transfer',
      [address(from), address(to), i128(amount)],
      options,
    )
    return this.retvalAmount(result.retval)
  }

  async paused(options: ReadOptions = {}): Promise<boolean> {
    const retval = await this.readValue('paused', [], options)
    return scValToNative(retval) as boolean
  }

  async setPaused(paused: boolean, options: InvokeOptions): Promise<void> {
    await this.invoke('set_paused', [bool(paused)], options)
  }

  async getTransferHook(options: ReadOptions = {}): Promise<string | null> {
    const retval = await this.readValue('get_transfer_hook', [], options)
    const native = scValToNative(retval)
    return native ? String(native) : null
  }

  async setTransferHook(hook: string | null, options: InvokeOptions): Promise<void> {
    await this.invoke('set_transfer_hook', [hook ? address(hook) : xdr.ScVal.scvVoid()], options)
  }

  async balanceOf(id: string, options: ReadOptions = {}): Promise<string> {
    const retval = await this.readValue('balance_of', [address(id)], options)
    return this.retvalAmount(retval)
  }

  async totalSupply(options: ReadOptions = {}): Promise<string> {
    const retval = await this.readValue('total_supply', [], options)
    return this.retvalAmount(retval)
  }

  async approve(
    from: string,
    spender: string,
    amount: string,
    expiration: number | bigint,
    options: InvokeOptions,
  ): Promise<void> {
    await this.invoke(
      'approve',
      [address(from), address(spender), i128(amount), u64(expiration)],
      options,
    )
  }

  async allowance(from: string, spender: string, options: ReadOptions = {}): Promise<string> {
    const retval = await this.readValue('allowance', [address(from), address(spender)], options)
    return this.retvalAmount(retval)
  }

  async transferFrom(
    spender: string,
    from: string,
    to: string,
    amount: string,
    options: InvokeOptions,
  ): Promise<string> {
    const result = await this.invoke(
      'transfer_from',
      [address(spender), address(from), address(to), i128(amount)],
      options,
    )
    return this.retvalAmount(result.retval)
  }

  async setAdmin(newAdmin: string, options: InvokeOptions): Promise<void> {
    await this.invoke('set_admin', [address(newAdmin)], options)
  }

  async adminTransfer(from: string, to: string, amount: string, options: InvokeOptions): Promise<string> {
    const result = await this.invoke(
      'admin_transfer',
      [address(from), address(to), i128(amount)],
      options,
    )
    return this.retvalAmount(result.retval)
  }

  async authorized(id: string, options: ReadOptions = {}): Promise<boolean> {
    const retval = await this.readValue('authorized', [address(id)], options)
    return scValToNative(retval) as boolean
  }

  async setAuthorized(id: string, authorize: boolean, options: InvokeOptions): Promise<void> {
    await this.invoke('set_authorized', [address(id), bool(authorize)], options)
  }

  async name(options: ReadOptions = {}): Promise<string> {
    const retval = await this.readValue('name', [], options)
    return scValToNative(retval) as string
  }

  async symbol(options: ReadOptions = {}): Promise<string> {
    const retval = await this.readValue('symbol', [], options)
    return scValToNative(retval) as string
  }

  async decimals(options: ReadOptions = {}): Promise<number> {
    const retval = await this.readValue('decimals', [], options)
    return scValToNative(retval) as number
  }

  async metadata(options: ReadOptions = {}): Promise<TokenMetadata> {
    const retval = await this.readValue('metadata', [], options)
    return scValToNative(retval) as TokenMetadata
  }

  getContractId(): string {
    return this.contractId
  }

  private retvalAmount(retval?: xdr.ScVal): string {
    if (!retval) {
      return '0'
    }
    return scValToNative(retval).toString()
  }

  private readValue(
    method: string,
    args: xdr.ScVal[],
    options: ReadOptions = {},
  ): Promise<xdr.ScVal> {
    return this.client.read(this.contractId, method, args, options) as Promise<xdr.ScVal>
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
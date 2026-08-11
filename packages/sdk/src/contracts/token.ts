import { Address, nativeToScVal, scValToNative } from '@stellar/stellar-sdk'
import type { SorobanClient } from '../client'

export class TokenClient {
  constructor(
    private client: SorobanClient,
    private contractId: string,
  ) {}

  async initialize(
    admin: string,
    name: string,
    symbol: string,
    decimals: number,
    maxSupply: string,
  ): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'initialize', [
      new Address(admin).toScVal(),
      nativeToScVal(name, { type: 'string' }),
      nativeToScVal(symbol, { type: 'string' }),
      nativeToScVal(decimals, { type: 'u32' }),
      nativeToScVal(BigInt(maxSupply), { type: 'i128' }),
    ])
    return String(scValToNative(result as import('@stellar/stellar-sdk').xdr.ScVal))
  }

  async mint(to: string, amount: string): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'mint', [
      new Address(to).toScVal(),
      nativeToScVal(BigInt(amount), { type: 'i128' }),
    ])
    return String(scValToNative(result as import('@stellar/stellar-sdk').xdr.ScVal))
  }

  async burn(from: string, amount: string): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'burn', [
      new Address(from).toScVal(),
      nativeToScVal(BigInt(amount), { type: 'i128' }),
    ])
    return String(scValToNative(result as import('@stellar/stellar-sdk').xdr.ScVal))
  }

  async transfer(from: string, to: string, amount: string): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'transfer', [
      new Address(from).toScVal(),
      new Address(to).toScVal(),
      nativeToScVal(BigInt(amount), { type: 'i128' }),
    ])
    return String(scValToNative(result as import('@stellar/stellar-sdk').xdr.ScVal))
  }

  async balanceOf(id: string): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'balance_of', [
      new Address(id).toScVal(),
    ])
    return String(scValToNative(result as import('@stellar/stellar-sdk').xdr.ScVal))
  }

  async approve(
    from: string,
    spender: string,
    amount: string,
    expiration: number,
  ): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'approve', [
      new Address(from).toScVal(),
      new Address(spender).toScVal(),
      nativeToScVal(BigInt(amount), { type: 'i128' }),
      nativeToScVal(expiration, { type: 'u32' }),
    ])
    return String(scValToNative(result as import('@stellar/stellar-sdk').xdr.ScVal))
  }

  async allowance(from: string, spender: string): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'allowance', [
      new Address(from).toScVal(),
      new Address(spender).toScVal(),
    ])
    return String(scValToNative(result as import('@stellar/stellar-sdk').xdr.ScVal))
  }

  async metadata(): Promise<{
    admin: string
    name: string
    symbol: string
    decimals: number
    max_supply: string
  }> {
    const result = await this.client.invokeContract(this.contractId, 'metadata', [])
    return scValToNative(result as import('@stellar/stellar-sdk').xdr.ScVal) as {
      admin: string
      name: string
      symbol: string
      decimals: number
      max_supply: string
    }
  }
}

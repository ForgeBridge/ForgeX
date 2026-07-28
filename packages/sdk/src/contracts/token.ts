import { Address, nativeToScVal, scValToNative } from '@stellar/stellar-sdk'
import { SorobanClient } from '../client'
import { TokenInfo } from '../types/token'

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
    return this.client.invokeContract(this.contractId, 'initialize', [
      new Address(admin).toScVal(),
      nativeToScVal(name),
      nativeToScVal(symbol),
      nativeToScVal(decimals),
      nativeToScVal(BigInt(maxSupply), true),
    ])
  }

  async mint(to: string, amount: string): Promise<string> {
    return this.client.invokeContract(this.contractId, 'mint', [
      new Address(to).toScVal(),
      nativeToScVal(BigInt(amount), true),
    ])
  }

  async burn(from: string, amount: string): Promise<string> {
    return this.client.invokeContract(this.contractId, 'burn', [
      new Address(from).toScVal(),
      nativeToScVal(BigInt(amount), true),
    ])
  }

  async transfer(from: string, to: string, amount: string): Promise<string> {
    return this.client.invokeContract(this.contractId, 'transfer', [
      new Address(from).toScVal(),
      new Address(to).toScVal(),
      nativeToScVal(BigInt(amount), true),
    ])
  }

  async balanceOf(id: string): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'balance_of', [
      new Address(id).toScVal(),
    ])
    return String(scValToNative(result))
  }

  async approve(
    from: string,
    spender: string,
    amount: string,
    expiration: number,
  ): Promise<string> {
    return this.client.invokeContract(this.contractId, 'approve', [
      new Address(from).toScVal(),
      new Address(spender).toScVal(),
      nativeToScVal(BigInt(amount), true),
      nativeToScVal(expiration),
    ])
  }

  async allowance(from: string, spender: string): Promise<string> {
    const result = await this.client.invokeContract(this.contractId, 'allowance', [
      new Address(from).toScVal(),
      new Address(spender).toScVal(),
    ])
    return String(scValToNative(result))
  }

  async metadata(): Promise<{
    admin: string
    name: string
    symbol: string
    decimals: number
    max_supply: string
  }> {
    const result = await this.client.invokeContract(this.contractId, 'metadata', [])
    return scValToNative(result) as any
  }
}

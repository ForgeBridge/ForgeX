import type { Abi, Address } from 'viem'

/**
 * Minimal transport the SDK needs.
 *
 * The web app satisfies it with a viem `PublicClient` (reads) wrapped together
 * with a viem `WalletClient` (writes), which keeps `viem` an implementation
 * detail of the app rather than a type dependency of the SDK. Tests satisfy it
 * with a plain object, so no chain is ever needed.
 */
export interface EvmReadTransport {
  read<T = unknown>(args: {
    address: Address
    abi: Abi
    functionName: string
    args?: readonly unknown[]
  }): Promise<T>
}

export interface EvmWriteTransport extends EvmReadTransport {
  write(args: {
    address: Address
    abi: Abi
    functionName: string
    args?: readonly unknown[]
    value?: bigint
  }): Promise<`0x${string}`>
  /** The connected account, or `null` when no wallet is attached. */
  readonly account: Address | null
  readonly chainId: number | null
}

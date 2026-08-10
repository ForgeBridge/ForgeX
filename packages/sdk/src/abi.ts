import { Address, ScInt, scValToNative, xdr } from '@stellar/stellar-sdk'

export function u32(value: number): xdr.ScVal {
  return xdr.ScVal.scvU32(value)
}

export function u64(value: number | bigint | string): xdr.ScVal {
  return new ScInt(value, { type: 'u64' }).toScVal()
}

export function i128(value: number | bigint | string): xdr.ScVal {
  return new ScInt(value, { type: 'i128' }).toScVal()
}

export function bool(value: boolean): xdr.ScVal {
  return xdr.ScVal.scvBool(value)
}

export function string(value: string): xdr.ScVal {
  return xdr.ScVal.scvString(value)
}

export function symbol(value: string): xdr.ScVal {
  return xdr.ScVal.scvSymbol(value)
}

export function address(value: string): xdr.ScVal {
  return new Address(value).toScVal()
}

export function addressOption(value: string | null): xdr.ScVal {
  if (value === null) {
    return xdr.ScVal.scvVoid()
  }
  return new Address(value).toScVal()
}

export function bytes(value: Uint8Array | ArrayBuffer | Buffer): xdr.ScVal {
  return xdr.ScVal.scvBytes(
    Uint8Array.from(value as Uint8Array) as unknown as Buffer,
  )
}

export function vec(values: xdr.ScVal[]): xdr.ScVal {
  return xdr.ScVal.scvVec(values)
}

export function toNative(value: xdr.ScVal | undefined): unknown {
  if (!value) {
    return null
  }
  return scValToNative(value)
}

export function toAmount(value: xdr.ScVal | undefined): string {
  const native = toNative(value)
  if (native === null || native === undefined) {
    return '0'
  }
  return String(native)
}

export function toBool(value: xdr.ScVal | undefined): boolean {
  return Boolean(toNative(value))
}

export function toAddress(value: xdr.ScVal | undefined): string {
  return toNative(value) as string
}

export function toOptionAddress(value: xdr.ScVal | undefined): string | null {
  const native = toNative(value)
  if (native === null) {
    return null
  }
  return native as string
}
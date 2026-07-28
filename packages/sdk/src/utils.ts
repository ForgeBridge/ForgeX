import { scValToNative, nativeToScVal } from '@stellar/stellar-sdk'

const SCALE = 10_000_000
const STROOPS_PER_XLM = 10_000_000

export function formatXLM(stroops: string | bigint): string {
  const value = Number(stroops) / STROOPS_PER_XLM
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  })
}

export function parseXLM(xlm: string): bigint {
  return BigInt(Math.floor(parseFloat(xlm) * STROOPS_PER_XLM))
}

export function formatTokenAmount(
  amount: string | bigint,
  decimals: number = 7,
): string {
  const value = Number(amount) / Math.pow(10, decimals)
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

export function parseTokenAmount(
  amount: string,
  decimals: number = 7,
): bigint {
  return BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)))
}

export function validateAddress(address: string): boolean {
  try {
    const { StrKey } = require('@stellar/stellar-sdk')
    return StrKey.isValidEd25519PublicKey(address)
  } catch {
    return address.length === 56 && address.startsWith('C')
  }
}

export function validateCreateTokenParams(params: {
  name: string
  symbol: string
  max_supply: string
  initial_price: string
}): string[] {
  const errors: string[] = []
  if (!params.name || params.name.length < 1 || params.name.length > 60) {
    errors.push('Name must be between 1 and 60 characters')
  }
  if (!params.symbol || params.symbol.length < 1 || params.symbol.length > 12) {
    errors.push('Symbol must be between 1 and 12 characters')
  }
  if (BigInt(params.max_supply) <= 0n) {
    errors.push('Max supply must be greater than 0')
  }
  if (BigInt(params.initial_price) <= 0n) {
    errors.push('Initial price must be greater than 0')
  }
  return errors
}

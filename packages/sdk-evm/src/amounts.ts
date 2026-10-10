import { formatUnits, parseUnits } from 'viem'
import { BPS, QUOTE_DECIMALS } from './types'

/**
 * Amount and quote helpers.
 *
 * The curve quotes in whole token base units for token amounts and in quote-asset
 * base units (USDC, 6 decimals on Arc) for money. Prices are SCALE-scaled fixed
 * point, exactly as in the Soroban contracts, so `price / SCALE` is the quote
 * price of one whole token.
 */

/** Parses a user-entered token amount into base units, throwing on bad input. */
export function parseTokenAmount(value: string, decimals: number): bigint {
  const trimmed = value.trim()
  if (!trimmed || !/^\d*\.?\d*$/.test(trimmed) || Number(trimmed) < 0) {
    throw new Error(`Invalid token amount: "${value}"`)
  }
  const [whole, fraction = ''] = trimmed.split('.')
  if (fraction.length > decimals) {
    throw new Error(`Too many decimals: at most ${decimals} are allowed`)
  }
  const padded = `${whole || '0'}.${fraction.padEnd(decimals, '0')}`
  return BigInt(parseUnits(padded, decimals))
}

/** Parses a user-entered quote amount (USDC) into base units. */
export function parseQuoteAmount(value: string): bigint {
  const trimmed = value.trim()
  if (!trimmed || !/^\d*\.?\d*$/.test(trimmed)) {
    throw new Error(`Invalid quote amount: "${value}"`)
  }
  const [whole, fraction = ''] = trimmed.split('.')
  if (fraction.length > QUOTE_DECIMALS) {
    throw new Error(`Too many decimals: at most ${QUOTE_DECIMALS} are allowed`)
  }
  const padded = `${whole || '0'}.${fraction.padEnd(QUOTE_DECIMALS, '0')}`
  return BigInt(parseUnits(padded, QUOTE_DECIMALS))
}

/** Formats base units back into a display string, trimming trailing zeros. */
export function formatTokenAmount(value: bigint, decimals: number, maxFractionDigits = 6): string {
  return Number(formatUnits(value, decimals)).toLocaleString('en-US', {
    maximumFractionDigits: Math.min(decimals, maxFractionDigits),
  })
}

export function formatQuoteAmount(value: bigint): string {
  return Number(formatUnits(value, QUOTE_DECIMALS)).toLocaleString('en-US', {
    maximumFractionDigits: QUOTE_DECIMALS,
  })
}

/**
 * Converts a SCALE-scaled contract price into a quote amount per whole token,
 * as a float for display. Precision is not needed: this only feeds labels.
 */
export function priceToQuote(price: bigint): number {
  return Number(price) / Number(1e7) / Number(10 ** QUOTE_DECIMALS)
}

/**
 * Widens `maxCost`/`minPayout` by a slippage percentage, the way the Soroban
 * frontend does it. Slippage is a percentage: `1` for 1%, matching the UI.
 */
export function applyBuySlippage(quotedOwed: bigint, slippagePercent: number): bigint {
  const pct = BigInt(Math.round(slippagePercent * 100))
  return (quotedOwed * (BPS + pct)) / BPS
}

export function applySellSlippage(quotedNet: bigint, slippagePercent: number): bigint {
  const pct = BigInt(Math.round(slippagePercent * 100))
  return (quotedNet * (BPS - pct)) / BPS
}

/** Unix timestamp `secondsFromNow` from now, for the trade deadline argument. */
export function deadlineFromNow(secondsFromNow: number, nowMs: number = Date.now()): bigint {
  return BigInt(Math.floor(nowMs / 1000) + secondsFromNow)
}

import { describe, expect, it } from 'vitest'

import {
  applyBuySlippage,
  applySellSlippage,
  deadlineFromNow,
  formatQuoteAmount,
  formatTokenAmount,
  parseQuoteAmount,
  parseTokenAmount,
  priceToQuote,
} from './amounts'

describe('parseTokenAmount', () => {
  it('parses whole and fractional amounts into base units', () => {
    expect(parseTokenAmount('1', 7)).toBe(10_000_000n)
    expect(parseTokenAmount('1.5', 7)).toBe(15_000_000n)
    expect(parseTokenAmount('0.0000001', 7)).toBe(1n)
    expect(parseTokenAmount('1000', 0)).toBe(1000n)
  })

  it('treats a leading dot and empty integer part as zero', () => {
    expect(parseTokenAmount('.5', 7)).toBe(5_000_000n)
  })

  it('rejects non-numeric input instead of silently returning zero', () => {
    expect(() => parseTokenAmount('abc', 7)).toThrow(/Invalid token amount/)
    expect(() => parseTokenAmount('1e5', 7)).toThrow(/Invalid token amount/)
    expect(() => parseTokenAmount('-1', 7)).toThrow(/Invalid token amount/)
    expect(() => parseTokenAmount('', 7)).toThrow(/Invalid token amount/)
  })

  it('rejects more decimals than the token has', () => {
    expect(() => parseTokenAmount('1.12345678', 7)).toThrow(/Too many decimals/)
  })
})

describe('parseQuoteAmount', () => {
  it('parses USDC amounts with six decimals', () => {
    expect(parseQuoteAmount('1')).toBe(1_000_000n)
    expect(parseQuoteAmount('0.000001')).toBe(1n)
  })

  it('rejects values with seven decimals, since USDC has six', () => {
    expect(() => parseQuoteAmount('0.0000001')).toThrow(/Too many decimals/)
  })
})

describe('formatting', () => {
  it('formats token amounts for display', () => {
    expect(formatTokenAmount(10_000_000n, 7)).toBe('1')
    expect(formatTokenAmount(15_000_000n, 7)).toBe('1.5')
  })

  it('formats quote amounts for display', () => {
    expect(formatQuoteAmount(1_000_000n)).toBe('1')
    expect(formatQuoteAmount(1_500n)).toBe('0.0015')
  })
})

describe('priceToQuote', () => {
  it('converts SCALE-scaled contract price into a quote price per whole token', () => {
    // price 1e7 with 6-decimal USDC is 0.000001 USDC per token
    expect(priceToQuote(10_000_000n)).toBeCloseTo(0.000001, 12)
    expect(priceToQuote(10_000_000_000n)).toBeCloseTo(0.001, 12)
  })
})

describe('slippage', () => {
  it('widens a buy quote by the slippage percentage', () => {
    // 1% of 1000 base units is 10
    expect(applyBuySlippage(1000n, 1)).toBe(1010n)
    expect(applyBuySlippage(1000n, 0)).toBe(1000n)
  })

  it('narrows a sell quote by the slippage percentage', () => {
    expect(applySellSlippage(1000n, 1)).toBe(990n)
    expect(applySellSlippage(1000n, 0)).toBe(1000n)
  })

  it('handles fractional percentages without floating-point drift', () => {
    // 0.5% of 1000 is 5, not 4.999...
    expect(applyBuySlippage(1000n, 0.5)).toBe(1005n)
    expect(applySellSlippage(1000n, 0.5)).toBe(995n)
  })

  it('never returns a negative sell limit even at extreme slippage', () => {
    expect(applySellSlippage(10n, 100)).toBe(0n)
  })
})

describe('deadlineFromNow', () => {
  it('returns a unix timestamp offset from now', () => {
    const now = 1_700_000_000_000
    expect(deadlineFromNow(3600, now)).toBe(1_700_003_600n)
    expect(deadlineFromNow(0, now)).toBe(1_700_000_000n)
  })
})

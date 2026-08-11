import { describe, it, expect } from 'vitest'
import {
  formatXLM,
  formatNumber,
  formatCurrency,
  formatPrice,
  formatTokenAmount,
  formatCompactNumber,
  formatPercent,
  truncateAddress,
  formatTimestamp,
  formatTimeAgo,
} from './format'

describe('Format Utilities (format.ts)', () => {
  describe('formatXLM', () => {
    it('converts stroops to formatted XLM string', () => {
      expect(formatXLM(10_000_000n)).toBe('1.00')
      expect(formatXLM(250_750_000)).toBe('25.075')
      expect(formatXLM('50000000')).toBe('5.00')
    })

    it('handles null, undefined, and invalid values safely', () => {
      expect(formatXLM(null as any)).toBe('0.00')
      expect(formatXLM(undefined as any)).toBe('0.00')
      expect(formatXLM('invalid')).toBe('0.00')
    })
  })

  describe('formatNumber', () => {
    it('formats numbers with thousands separators and optional decimals', () => {
      expect(formatNumber(1250000)).toBe('1,250,000')
      expect(formatNumber('4500.5', 2)).toBe('4,500.50')
      expect(formatNumber(null)).toBe('0')
    })
  })

  describe('formatCurrency', () => {
    it('formats currency values with custom symbol and decimal precision', () => {
      expect(formatCurrency(1250.5, 'XLM', 2)).toBe('1,250.50 XLM')
      expect(formatCurrency(500, '$', 2)).toBe('$500.00')
      expect(formatCurrency(null)).toBe('0.00 XLM')
    })
  })

  describe('formatPrice', () => {
    it('formats price with appropriate precision', () => {
      expect(formatPrice('0.000452', 2, 6)).toBe('0.000452')
      expect(formatPrice('15.5', 2, 4)).toBe('15.50')
      expect(formatPrice(0.00000005)).toBe('< 0.000001')
      expect(formatPrice(null)).toBe('0.00')
    })
  })

  describe('formatTokenAmount', () => {
    it('scales amounts down by token decimals', () => {
      expect(formatTokenAmount(10_000_000n, 7)).toBe('1')
      expect(formatTokenAmount('5000000', 6)).toBe('5')
      expect(formatTokenAmount(null)).toBe('0')
    })
  })

  describe('formatCompactNumber', () => {
    it('formats large numbers into compact notation', () => {
      expect(formatCompactNumber(1500)).toBe('1.5K')
      expect(formatCompactNumber(2500000)).toBe('2.5M')
      expect(formatCompactNumber(1000000000)).toBe('1B')
    })
  })

  describe('formatPercent', () => {
    it('formats percentages with +/- signs', () => {
      expect(formatPercent(4.25)).toBe('+4.25%')
      expect(formatPercent(-1.5)).toBe('-1.50%')
      expect(formatPercent(0)).toBe('0.00%')
      expect(formatPercent(4.25, false)).toBe('4.25%')
    })
  })

  describe('truncateAddress', () => {
    it('truncates Stellar address safely', () => {
      const addr = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
      expect(truncateAddress(addr, 4, 4)).toBe('GAAA...AWHF')
      expect(truncateAddress('')).toBe('')
      expect(truncateAddress('SHORT')).toBe('SHORT')
    })
  })

  describe('formatTimestamp and formatTimeAgo', () => {
    it('formats date and relative time', () => {
      const now = Math.floor(Date.now() / 1000)
      expect(formatTimeAgo(now - 10)).toBe('10s ago')
      expect(formatTimeAgo(now - 120)).toBe('2m ago')
      expect(formatTimeAgo(now - 7200)).toBe('2h ago')
      expect(formatTimeAgo(now - 172800)).toBe('2d ago')
      expect(formatTimestamp(1700000000)).toBeDefined()
    })
  })
})

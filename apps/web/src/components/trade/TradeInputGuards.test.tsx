import { describe, it, expect } from 'vitest'
import { sanitizeNumericInput, validateTradeAmount } from '../../lib/inputGuards'

describe('Trade Input Guards & Sanitization', () => {
  describe('sanitizeNumericInput', () => {
    it('strips non-numeric characters like e, -, +, text', () => {
      expect(sanitizeNumericInput('1e10')).toBe('110')
      expect(sanitizeNumericInput('-50.5')).toBe('50.5')
      expect(sanitizeNumericInput('+100')).toBe('100')
      expect(sanitizeNumericInput('abc123xyz')).toBe('123')
    })

    it('enforces single decimal point', () => {
      expect(sanitizeNumericInput('1.2.3.4')).toBe('1.234')
    })

    it('enforces maximum decimal precision length', () => {
      expect(sanitizeNumericInput('1.123456789', 7)).toBe('1.1234567')
      expect(sanitizeNumericInput('0.1234', 2)).toBe('0.12')
    })

    it('cleans up leading zeros safely', () => {
      expect(sanitizeNumericInput('005')).toBe('5')
      expect(sanitizeNumericInput('0.5')).toBe('0.5')
    })
  })

  describe('validateTradeAmount', () => {
    it('rejects empty or zero amounts', () => {
      expect(validateTradeAmount('').isValid).toBe(false)
      expect(validateTradeAmount('0').isValid).toBe(false)
      expect(validateTradeAmount('-5').isValid).toBe(false)
    })

    it('validates positive decimal amounts within limits', () => {
      expect(validateTradeAmount('10.5').isValid).toBe(true)
    })

    it('rejects amounts exceeding available balance', () => {
      const res = validateTradeAmount('500', { maxAmount: '200', tokenSymbol: 'FORGE' })
      expect(res.isValid).toBe(false)
      expect(res.error).toContain('Insufficient balance')
    })

    it('rejects decimal precision exceeding maximum allowed', () => {
      const res = validateTradeAmount('1.12345678', { maxDecimals: 7 })
      expect(res.isValid).toBe(false)
      expect(res.error).toContain('Maximum decimal precision')
    })
  })
})

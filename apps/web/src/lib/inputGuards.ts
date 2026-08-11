/**
 * Sanitizes numeric input string:
 * - Strips all non-digit, non-period characters
 * - Ensures at most one decimal point
 * - Restricts decimals to maxDecimals precision
 * - Prevents multiple leading zeroes
 */
export function sanitizeNumericInput(
  value: string,
  maxDecimals: number = 7
): string {
  if (!value) return ''

  // Strip invalid characters like 'e', 'E', '-', '+', spaces
  let cleaned = value.replace(/[^0-9.]/g, '')

  // Ensure only one decimal point
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    cleaned = `${parts[0]}.${parts.slice(1).join('')}`
  }

  // Enforce max decimal places
  if (parts.length === 2) {
    const integerPart = parts[0]
    const decimalPart = parts[1].slice(0, maxDecimals)
    cleaned = `${integerPart}.${decimalPart}`
  }

  // Remove leading zeros from whole number part (except when '0' or '0.')
  if (cleaned.startsWith('0') && cleaned.length > 1 && cleaned[1] !== '.') {
    cleaned = cleaned.replace(/^0+/, '') || '0'
  }

  return cleaned
}

/**
 * Validates trade amounts with balance and precision checks
 */
export function validateTradeAmount(
  amount: string,
  options: {
    maxAmount?: number | string | null
    maxDecimals?: number
    tokenSymbol?: string
  } = {}
): { isValid: boolean; error?: string } {
  const { maxAmount, maxDecimals = 7, tokenSymbol } = options

  if (!amount || !amount.trim()) {
    return { isValid: false, error: 'Amount is required' }
  }

  const num = parseFloat(amount)
  if (isNaN(num) || num <= 0) {
    return { isValid: false, error: 'Please enter a valid amount greater than 0' }
  }

  // Check decimal precision
  const parts = amount.split('.')
  if (parts.length === 2 && parts[1].length > maxDecimals) {
    return {
      isValid: false,
      error: `Maximum decimal precision is ${maxDecimals} places`,
    }
  }

  // Check against maximum balance if provided
  if (maxAmount !== undefined && maxAmount !== null) {
    const maxNum = typeof maxAmount === 'string' ? parseFloat(maxAmount.replace(/,/g, '')) : maxAmount
    if (!isNaN(maxNum) && num > maxNum) {
      const symbolSuffix = tokenSymbol ? ` ${tokenSymbol}` : ''
      return {
        isValid: false,
        error: `Insufficient balance (maximum: ${maxNum}${symbolSuffix})`,
      }
    }
  }

  return { isValid: true }
}

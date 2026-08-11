const STROOPS_PER_XLM = 10_000_000

/**
 * Format raw stroops (1 XLM = 10^7 stroops) to formatted XLM string
 */
export function formatXLM(stroops: bigint | string | number): string {
  if (stroops === null || stroops === undefined || stroops === '') return '0.00'
  const num = typeof stroops === 'bigint' ? Number(stroops) : Number(stroops)
  if (isNaN(num)) return '0.00'
  const value = num / STROOPS_PER_XLM
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  })
}

/**
 * Format generic number with thousands separators and optional fixed decimal precision
 */
export function formatNumber(
  value: number | string | null | undefined,
  decimals?: number
): string {
  if (value === null || value === undefined || value === '') return '0'
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value
  if (isNaN(num)) return '0'

  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals !== undefined ? decimals : 0,
    maximumFractionDigits: decimals !== undefined ? decimals : 4,
  })
}

/**
 * Format currency amount with currency suffix or prefix (e.g. "1,250.00 XLM" or "$1,250.00")
 */
export function formatCurrency(
  amount: string | number | null | undefined,
  currency: string = 'XLM',
  decimals: number = 2
): string {
  if (amount === null || amount === undefined || amount === '') return `0.00 ${currency}`
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount
  if (isNaN(num)) return `0.00 ${currency}`

  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return currency.startsWith('$') ? `${currency}${formatted}` : `${formatted} ${currency}`
}

/**
 * Format token price with smart precision for small values (e.g., 0.000045 or 1.25)
 */
export function formatPrice(
  price: string | number | null | undefined,
  minDecimals: number = 2,
  maxDecimals: number = 7
): string {
  if (price === null || price === undefined || price === '') return '0.00'
  const num = typeof price === 'string' ? parseFloat(price.replace(/,/g, '')) : price
  if (isNaN(num)) return '0.00'
  if (num === 0) return '0.00'

  if (num < 0.000001) {
    return '< 0.000001'
  }

  return num.toLocaleString('en-US', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  })
}

/**
 * Format token amount scaled down by token decimals (e.g., 7 or 18 decimals)
 */
export function formatTokenAmount(
  amount: bigint | string | number | null | undefined,
  decimals: number = 7
): string {
  if (amount === null || amount === undefined || amount === '') return '0'
  const num = typeof amount === 'bigint' ? Number(amount) : Number(amount)
  if (isNaN(num)) return '0'

  const value = num / Math.pow(10, decimals)
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format compact number with metric suffixes (e.g. 1.5K, 2.3M, 10.5B)
 */
export function formatCompactNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0'
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value
  if (isNaN(num)) return '0'

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Format percentage change with optional +/- sign (e.g. "+4.25%" or "-1.20%")
 */
export function formatPercent(
  value: number | string | null | undefined,
  includeSign: boolean = true
): string {
  if (value === null || value === undefined || value === '') return '0.00%'
  const num = typeof value === 'string' ? parseFloat(value.replace(/%/g, '')) : value
  if (isNaN(num)) return '0.00%'

  const sign = includeSign && num > 0 ? '+' : ''
  return `${sign}${num.toFixed(2)}%`
}

/**
 * Truncate Stellar address (e.g., GAAA...AWHF)
 */
export function truncateAddress(
  address: string,
  startChars: number = 4,
  endChars: number = 4
): string {
  if (!address || address.length <= startChars + endChars) return address || ''
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

/**
 * Format unix timestamp to readable date (e.g., "Jan 15, 2026")
 */
export function formatTimestamp(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) return ''
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format relative time ago (e.g., "5m ago", "2h ago", "3d ago")
 */
export function formatTimeAgo(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) return ''
  const now = Math.floor(Date.now() / 1000)
  const diff = Math.max(0, now - timestamp)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

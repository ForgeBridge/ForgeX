/** Turns raw contract errors into messages a user can act on. */

export type EvmErrorKind =
  | 'user-rejected'
  | 'insufficient-funds'
  | 'insufficient-allowance'
  | 'slippage'
  | 'deadline'
  | 'cap'
  | 'limits'
  | 'paused'
  | 'unauthorized'
  | 'reentrancy'
  | 'not-initialized'
  | 'not-found'
  | 'network'
  | 'contract'
  | 'unknown'

export interface ClassifiedError {
  kind: EvmErrorKind
  /** Message safe to show to a user. */
  message: string
}

interface Pattern {
  kind: EvmErrorKind
  matches: RegExp
  message: string
}

const PATTERNS: Pattern[] = [
  { kind: 'user-rejected', matches: /user (rejected|denied)|rejected the request|cancell?ed by user/i, message: 'You rejected the request in your wallet.' },
  { kind: 'insufficient-funds', matches: /insufficient funds|exceeds balance/i, message: 'Not enough USDC to cover the trade and gas.' },
  { kind: 'insufficient-allowance', matches: /insufficient allowance|allowance/i, message: 'Approve the curve to spend your USDC first.' },
  { kind: 'slippage', matches: /SlippageExceeded|InsufficientPayout|slippage/i, message: 'Price moved past your slippage limit. Try again.' },
  { kind: 'deadline', matches: /DeadlineExpired|deadline/i, message: 'The order expired before it was included. Refresh and retry.' },
  { kind: 'cap', matches: /CapExceeded|InvalidCap|curve cap/i, message: 'This token has reached its supply cap.' },
  { kind: 'limits', matches: /BuyBelowMinimum|BuyExceedsMaximum|SellBelowMinimum|SellExceedsMaximum|InvalidBuyLimits|InvalidSellLimits/i, message: 'The amount is outside this curve\'s trade size limits.' },
  { kind: 'paused', matches: /ContractPaused/i, message: 'Trading is paused for this token.' },
  { kind: 'unauthorized', matches: /UnauthorizedError|Unauthorized\(|not the admin/i, message: 'That action is restricted to the curve admin.' },
  { kind: 'reentrancy', matches: /ReentrancyGuard|reentrancy/i, message: 'The trade was refused by the reentrancy guard. Try again.' },
  { kind: 'not-initialized', matches: /AlreadyInitializedError|NotFactory/i, message: 'This contract is not configured for that call.' },
  { kind: 'not-found', matches: /TokenNotFound|TokenExists/i, message: 'No such token is registered with the factory.' },
  { kind: 'network', matches: /chain id|network|fetch failed|time[d]? ?out| ECONNREFUSED|-32014|-32012/i, message: 'The Arc RPC is unreachable. Retry in a moment.' },
]

/** Contract error names that mean a call failed inside the contract, not on the wire. */
const CONTRACT_ERROR_NAMES = [
  'InvalidBuyAmount',
  'InvalidSellAmount',
  'InvalidAmount',
  'IncorrectPayment',
  'QuoteTransferFailed',
  'CurveInvariantBroken',
  'InvalidCurveParams',
  'InvalidMetadata',
  'AlreadyInitialized',
  'DeploymentFailed',
]

export function classifyError(error: unknown): ClassifiedError {
  const text = extractText(error)
  for (const pattern of PATTERNS) {
    if (pattern.matches.test(text)) {
      return { kind: pattern.kind, message: pattern.message }
    }
  }
  for (const name of CONTRACT_ERROR_NAMES) {
    if (text.includes(name)) {
      return { kind: 'contract', message: `The curve refused the trade: ${name}.` }
    }
  }
  return { kind: 'unknown', message: 'The transaction failed. Please try again.' }
}

function extractText(error: unknown): string {
  if (typeof error === 'string') return error
  if (error instanceof Error) return `${error.message} ${(error as { shortMessage?: string }).shortMessage ?? ''}`
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>
    const parts = [
      record.message,
      record.shortMessage,
      record.reason,
      typeof record.data === 'object' && record.data ? (record.data as Record<string, unknown>).message : undefined,
    ]
    return parts.filter(Boolean).join(' ')
  }
  return String(error)
}

/** Types shared by the Arc deployment clients and the web app. */

/** Fixed-point scale used by the curve math, identical to the Soroban SCALE. */
export const SCALE = 10_000_000

export const BPS = 10_000n

/** Decimals of USDC on Arc; the quote asset for every curve. */
export const QUOTE_DECIMALS = 6

export interface CreateTokenParams {
  name: string
  symbol: string
  decimals: number
  max_supply: bigint
  image_uri: string
  description: string
  initial_price: bigint
  steepness: bigint
  reserve_target: bigint
}

/** Mirrors `IForgeXTypes.TokenInfo`, which mirrors the Soroban `TokenInfo`. */
export interface TokenInfo {
  token_id: `0x${string}`
  curve_id: `0x${string}`
  creator: `0x${string}`
  name: string
  symbol: string
  decimals: number
  max_supply: bigint
  image_uri: string
  description: string
  created_at: bigint
}

/** Mirrors `IForgeXTypes.CurveInfo`, which mirrors the Soroban `CurveInfo`. */
export interface CurveInfo {
  token_id: `0x${string}`
  initial_price: bigint
  steepness: bigint
  reserve_target: bigint
  reserve: bigint
  tokens_sold: bigint
  price: bigint
  market_cap: bigint
  admin: `0x${string}`
  fee_rate: bigint
  cap: bigint
  graduated: boolean
  admin_fees: bigint
}

/** What the curve charges a buyer for `amount_out` tokens, fees included. */
export interface BuyQuote {
  /** Quote tokens (USDC base units) the buyer will be charged. */
  owed: bigint
  /** Reserve credit, i.e. `owed` minus the fee. */
  cost: bigint
  fee: bigint
  /** Price at the supply the buy would reach. */
  price: bigint
}

/** What the curve pays a seller for `amount_in` tokens, fees deducted. */
export interface SellQuote {
  /** Quote tokens the seller receives. */
  net: bigint
  /** Reserve debit before fees. */
  payout: bigint
  fee: bigint
  price: bigint
}

export interface TradeResult {
  hash: `0x${string}`
  status: 'success' | 'reverted'
}

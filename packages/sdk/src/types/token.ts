import type { CurveParams } from './curve'

export interface TokenMetadata {
  admin: string
  name: string
  symbol: string
  decimals: number
  max_supply: string
}

export interface InterfaceVersion {
  interface: number
  implementation: number
}

export interface TokenInfo {
  token_id: string
  curve_id: string
  creator: string
  name: string
  symbol: string
  decimals: number
  max_supply: string
  image_uri: string
  description: string
  created_at: number
}

export interface CreateTokenParams {
  /** Display name of the token (1-32 bytes). */
  name: string
  /** Ticker symbol of the token (1-32 bytes). */
  symbol: string
  decimals: number
  max_supply: string
  image_uri: string
  description: string
  curve_params: CurveParams
}
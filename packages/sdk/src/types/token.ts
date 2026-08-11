import type { CurveParams } from './curve'

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
  name: string
  symbol: string
  decimals: number
  max_supply: string
  image_uri: string
  description: string
  curve_params: CurveParams
}

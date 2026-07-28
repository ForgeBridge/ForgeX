export interface CurveParams {
  initial_price: string
  steepness: string
  reserve_target: string
}

export interface CurveInfo {
  token_id: string
  params: CurveParams
  reserve: string
  tokens_sold: string
  price: string
  market_cap: string
  admin: string
}

export interface CurveState {
  reserve: string
  tokens_sold: string
}

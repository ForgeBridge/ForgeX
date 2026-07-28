export interface ForgeXEvent {
  type: string
  topics: string[]
  data: string
  ledger: number
  timestamp: number
}

export interface BuyEvent extends ForgeXEvent {
  buyer: string
  amount_out: string
  cost: string
  new_price: string
  new_reserve: string
}

export interface SellEvent extends ForgeXEvent {
  seller: string
  amount_in: string
  payout: string
  new_price: string
  new_reserve: string
}

export interface TokenCreatedEvent extends ForgeXEvent {
  token_id: string
  curve_id: string
  creator: string
  name: string
  symbol: string
}

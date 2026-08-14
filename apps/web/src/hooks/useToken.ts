'use client'

import { create } from 'zustand'
import { ForgeXClient } from '@forgex/sdk'
import {
  NETWORKS,
  DEFAULT_NETWORK,
  FACTORY_CONTRACT_ID,
  SCALE,
} from '../lib/constants'

export interface TokenItem {
  name: string
  symbol: string
  marketCap: string
  price: string
  imageUri?: string
  createdAt: number
  tokenId?: string
  curveId?: string
  description?: string
}

export interface TokenStoreState {
  tokens: TokenItem[]
  loading: boolean
  error: string | null
  fetchTokens: () => Promise<void>
  retry: () => Promise<void>
  clearError: () => void
  setTokens: (tokens: TokenItem[]) => void
  setError: (error: string | null) => void
}

export const useTokenStore = create<TokenStoreState>((set, get) => ({
  tokens: [],
  loading: false,
  error: null,
  clearError: () => set({ error: null }),
  setTokens: (tokens: TokenItem[]) => set({ tokens, error: null }),
  setError: (error: string | null) => set({ error }),
  fetchTokens: async () => {
    set({ loading: true, error: null })
    try {
      const factoryContractId = FACTORY_CONTRACT_ID
      if (!factoryContractId) {
        set({ loading: false, tokens: [], error: null })
        return
      }

      const network = DEFAULT_NETWORK
      const rpcUrl = NETWORKS[network]?.rpcUrl || ''
      const forgex = new ForgeXClient({ network, rpcUrl })

      const records = await forgex.factory(factoryContractId).getAllTokens()

      const tokens: TokenItem[] = await Promise.all(
        records.map(async (record) => {
          let price = ''
          let marketCap = ''
          if (record.curve_id) {
            try {
              const curve = await forgex
                .bondingCurve(record.curve_id)
                .getCurveInfo()
              price = scaleToXlm(curve.price)
              marketCap = scaleToXlm(curve.market_cap)
            } catch {
              // Curve state unavailable; feed will render without price
            }
          }
          return {
            name: record.name,
            symbol: record.symbol,
            marketCap: Number.parseFloat(marketCap) > 0 ? marketCap : '0',
            price: Number.parseFloat(price) > 0 ? price : '0',
            imageUri: record.image_uri || undefined,
            createdAt: record.created_at,
            tokenId: record.token_id || undefined,
            curveId: record.curve_id || undefined,
            description: record.description || undefined,
          }
        }),
      )

      set({ loading: false, tokens, error: null })
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch tokens from contract'
      set({ loading: false, error: errorMessage })
    }
  },
  retry: async () => {
    return get().fetchTokens()
  },
}))

/** Converts a contract i128 (scaled by SCALE) into a human-readable XLM string. */
function scaleToXlm(raw: string): string {
  const n = Number(raw) / SCALE
  if (!Number.isFinite(n)) return '0'
  return n < 1
    ? n.toFixed(7)
    : n.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

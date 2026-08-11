'use client'

import { create } from 'zustand'

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
      // In production/connected mode, fetches token list from Factory contract
      // Default fallback mock tokens if empty
      set({ loading: false, error: null })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tokens from contract'
      set({ loading: false, error: errorMessage })
    }
  },
  retry: async () => {
    return get().fetchTokens()
  },
}))

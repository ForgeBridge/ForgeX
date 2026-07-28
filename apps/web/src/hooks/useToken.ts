'use client'

import { create } from 'zustand'

interface TokenState {
  tokens: any[]
  loading: boolean
  fetchTokens: () => Promise<void>
}

export const useTokenStore = create<TokenState>((set) => ({
  tokens: [],
  loading: false,
  fetchTokens: async () => {
    set({ loading: true })
    // TODO: Fetch from Factory contract via SDK
    set({ loading: false })
  },
}))

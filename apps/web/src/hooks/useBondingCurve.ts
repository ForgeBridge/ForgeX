'use client'

import { create } from 'zustand'

export interface TradeState {
  buyAmount: string
  sellAmount: string
  slippage: number // in percentage e.g. 1 for 1%
  estimatedCost: string
  estimatedPayout: string
  setSlippage: (slippage: number) => void
  setBuyAmount: (buyAmount: string) => void
  setSellAmount: (sellAmount: string) => void
  setEstimatedCost: (estimatedCost: string) => void
  setEstimatedPayout: (estimatedPayout: string) => void
  resetTradeState: () => void
}

export const useTradeStore = create<TradeState>((set) => ({
  buyAmount: '',
  sellAmount: '',
  slippage: 1, // default 1%
  estimatedCost: '0',
  estimatedPayout: '0',

  setSlippage: (slippage: number) => set({ slippage }),
  setBuyAmount: (buyAmount: string) => set({ buyAmount }),
  setSellAmount: (sellAmount: string) => set({ sellAmount }),
  setEstimatedCost: (estimatedCost: string) => set({ estimatedCost }),
  setEstimatedPayout: (estimatedPayout: string) => set({ estimatedPayout }),
  resetTradeState: () =>
    set({
      buyAmount: '',
      sellAmount: '',
      estimatedCost: '0',
      estimatedPayout: '0',
    }),
}))

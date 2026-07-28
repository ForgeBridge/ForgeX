'use client'

import { create } from 'zustand'

interface TradeState {
  buyAmount: string
  sellAmount: string
  slippage: number
  estimatedCost: string
  estimatedPayout: string
}

export const useTradeStore = create<TradeState>(() => ({
  buyAmount: '',
  sellAmount: '',
  slippage: 5,
  estimatedCost: '0',
  estimatedPayout: '0',
}))

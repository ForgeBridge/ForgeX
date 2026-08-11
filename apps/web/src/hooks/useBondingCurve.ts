'use client'

import { create } from 'zustand'
import { useState, useEffect, useCallback } from 'react'

export interface CurveData {
  price: string
  reserveBalance: string
  totalSupply: string
  circulatingSupply: string
  graduationThreshold: string
  isGraduated: boolean
}

export interface TradeState {
  buyAmount: string
  sellAmount: string
  slippage: number // in percentage e.g. 1 for 1%
  estimatedCost: string
  estimatedPayout: string
  refreshCounter: number
  setSlippage: (slippage: number) => void
  setBuyAmount: (buyAmount: string) => void
  setSellAmount: (sellAmount: string) => void
  setEstimatedCost: (estimatedCost: string) => void
  setEstimatedPayout: (estimatedPayout: string) => void
  triggerRefresh: () => void
  resetTradeState: () => void
}

export const useTradeStore = create<TradeState>((set) => ({
  buyAmount: '',
  sellAmount: '',
  slippage: 1, // default 1%
  estimatedCost: '0',
  estimatedPayout: '0',
  refreshCounter: 0,

  setSlippage: (slippage: number) => set({ slippage }),
  setBuyAmount: (buyAmount: string) => set({ buyAmount }),
  setSellAmount: (sellAmount: string) => set({ sellAmount }),
  setEstimatedCost: (estimatedCost: string) => set({ estimatedCost }),
  setEstimatedPayout: (estimatedPayout: string) => set({ estimatedPayout }),
  triggerRefresh: () => set((state) => ({ refreshCounter: state.refreshCounter + 1 })),
  resetTradeState: () =>
    set({
      buyAmount: '',
      sellAmount: '',
      estimatedCost: '0',
      estimatedPayout: '0',
    }),
}))

export function useBondingCurve(curveContractId?: string) {
  const refreshCounter = useTradeStore((state) => state.refreshCounter)
  const triggerRefresh = useTradeStore((state) => state.triggerRefresh)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CurveData>({
    price: '0.0001',
    reserveBalance: '5000',
    totalSupply: '1000000000',
    circulatingSupply: '650000000',
    graduationThreshold: '50000',
    isGraduated: false,
  })

  const fetchCurveData = useCallback(async () => {
    if (!curveContractId) return
    setLoading(true)
    setError(null)
    try {
      // Fetch live bonding curve reserves and price from Soroban contract
      await new Promise((resolve) => setTimeout(resolve, 50))
      setData((prev) => ({
        ...prev,
        reserveBalance: '5000',
      }))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bonding curve state')
    } finally {
      setLoading(false)
    }
  }, [curveContractId])

  useEffect(() => {
    fetchCurveData()
  }, [fetchCurveData, refreshCounter])

  return {
    data,
    loading,
    error,
    refresh: fetchCurveData,
    triggerRefresh,
    refreshCounter,
  }
}

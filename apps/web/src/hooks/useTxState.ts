import { create } from 'zustand'

export type TxStatus =
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'submitting'
  | 'pending'
  | 'success'
  | 'error'

export interface TxDetails {
  type: 'buy' | 'sell' | 'create'
  amount?: string
  tokenSymbol?: string
  tokenName?: string
  txHash?: string
  errorMessage?: string
  startedAt?: number
  completedAt?: number
}

export interface TxState {
  status: TxStatus
  currentTx: TxDetails | null
  history: TxDetails[]
  
  // Actions
  startTx: (details: Omit<TxDetails, 'startedAt' | 'completedAt'>) => void
  setSigning: () => void
  setSubmitting: () => void
  setPending: (txHash?: string) => void
  setSuccess: (txHash?: string) => void
  setError: (errorMessage: string) => void
  reset: () => void
  clearHistory: () => void
}

export const useTxStore = create<TxState>((set) => ({
  status: 'idle',
  currentTx: null,
  history: [],

  startTx: (details) =>
    set({
      status: 'preparing',
      currentTx: {
        ...details,
        startedAt: Date.now(),
      },
    }),

  setSigning: () =>
    set((state) => ({
      status: 'signing',
      currentTx: state.currentTx ? { ...state.currentTx } : null,
    })),

  setSubmitting: () =>
    set((state) => ({
      status: 'submitting',
      currentTx: state.currentTx ? { ...state.currentTx } : null,
    })),

  setPending: (txHash) =>
    set((state) => ({
      status: 'pending',
      currentTx: state.currentTx
        ? {
            ...state.currentTx,
            txHash: txHash || state.currentTx.txHash,
          }
        : null,
    })),

  setSuccess: (txHash) =>
    set((state) => {
      const completedTx: TxDetails = {
        ...(state.currentTx || { type: 'buy' }),
        txHash: txHash || state.currentTx?.txHash,
        completedAt: Date.now(),
      }
      return {
        status: 'success',
        currentTx: completedTx,
        history: [completedTx, ...state.history].slice(0, 50),
      }
    }),

  setError: (errorMessage) =>
    set((state) => {
      const failedTx: TxDetails = {
        ...(state.currentTx || { type: 'buy' }),
        errorMessage,
        completedAt: Date.now(),
      }
      return {
        status: 'error',
        currentTx: failedTx,
        history: [failedTx, ...state.history].slice(0, 50),
      }
    }),

  reset: () =>
    set({
      status: 'idle',
      currentTx: null,
    }),

  clearHistory: () =>
    set({
      history: [],
    }),
}))

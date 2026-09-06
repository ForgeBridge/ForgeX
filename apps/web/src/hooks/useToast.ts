'use client'

import { create } from 'zustand'

export type ToastType = 'info' | 'success' | 'error' | 'pending'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
  txHash?: string
  explorerUrl?: string
  durationMs?: number // 0 for persistent (e.g. pending)
  createdAt: number
}

export interface ToastStoreState {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id' | 'createdAt'>) => string
  updateToast: (id: string, updates: Partial<Omit<ToastItem, 'id'>>) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

let toastCounter = 0

/**
 * Toast durations (verified):
 * - success/info: 5000ms default
 * - error: 6000ms (callers pass durationMs: 6000)
 * - pending: 0 = persistent until updateToast/removeToast
 *
 * Auto-dismiss is owned by ToastCard (hover/focus pauses the countdown);
 * the store only holds data and never sets timers, so pausing is reliable.
 */
export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++toastCounter}-${Date.now()}`
    const newToast: ToastItem = {
      ...toast,
      id,
      createdAt: Date.now(),
      durationMs: toast.durationMs ?? (toast.type === 'pending' ? 0 : 5000),
    }

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }))

    return id
  },

  updateToast: (id, updates) => {
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }))
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  clearAll: () => set({ toasts: [] }),
}))

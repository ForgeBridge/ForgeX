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

export const useToastStore = create<ToastStoreState>((set, get) => ({
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

    if (newToast.durationMs && newToast.durationMs > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, newToast.durationMs)
    }

    return id
  },

  updateToast: (id, updates) => {
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }))

    const updated = get().toasts.find((t) => t.id === id)
    if (updated && updated.durationMs && updated.durationMs > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, updated.durationMs)
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  clearAll: () => set({ toasts: [] }),
}))

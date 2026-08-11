'use client'

import { create } from 'zustand'

export type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  initTheme: () => void
}

const STORAGE_KEY = 'forgex_theme'

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',

  initTheme: () => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    const initialTheme: Theme = saved === 'light' || saved === 'dark' ? saved : get().theme
    document.documentElement.setAttribute('data-theme', initialTheme)
    set({ theme: initialTheme })
  },

  setTheme: (theme: Theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, theme)
      document.documentElement.setAttribute('data-theme', theme)
    }
    set({ theme })
  },

  toggleTheme: () => {
    const current = get().theme
    const next: Theme = current === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },
}))

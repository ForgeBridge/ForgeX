'use client'

import { create } from 'zustand'

export interface ChapterMeta {
  id: string
  title: string
}

/** AuraSea-style sequence: opening → story → action → board → beginning. */
export const CHAPTERS: ChapterMeta[] = [
  { id: 'opening', title: 'Opening' },
  { id: 'curve', title: 'The curve' },
  { id: 'forge', title: 'Forge' },
  { id: 'board', title: 'The board' },
  { id: 'begin', title: 'Your beginning' },
]

export const BOARD_INDEX = CHAPTERS.findIndex((c) => c.id === 'board')

interface JourneyState {
  index: number
  pulse: number
  next: () => void
  back: () => void
  goTo: (index: number) => void
  reset: () => void
  firePulse: () => void
}

export const useJourneyStore = create<JourneyState>((set, get) => ({
  index: 0,
  pulse: 0,

  next: () =>
    set((state) => ({
      index: Math.min(state.index + 1, CHAPTERS.length - 1),
    })),

  back: () =>
    set((state) => ({
      index: Math.max(state.index - 1, 0),
    })),

  goTo: (index: number) =>
    set(() => ({
      index: Math.max(0, Math.min(index, CHAPTERS.length - 1)),
    })),

  reset: () => set(() => ({ index: 0 })),

  firePulse: () => set((state) => ({ pulse: state.pulse + 1 })),
}))

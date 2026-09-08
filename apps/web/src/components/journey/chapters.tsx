'use client'

import type { ComponentType } from 'react'
import { OpeningChapter } from './OpeningChapter'
import { CurveChapter } from './CurveChapter'

/** Chapter registry — one entry per page of the journey, added step by step. */
export const CHAPTER_COMPONENTS: Record<string, ComponentType> = {
  opening: OpeningChapter,
  curve: CurveChapter,
}

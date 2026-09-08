'use client'

import type { ComponentType } from 'react'
import { OpeningChapter } from './OpeningChapter'
import { CurveChapter } from './CurveChapter'
import { ForgeChapter } from './ForgeChapter'

/** Chapter registry — one entry per page of the journey, added step by step. */
export const CHAPTER_COMPONENTS: Record<string, ComponentType> = {
  opening: OpeningChapter,
  curve: CurveChapter,
  forge: ForgeChapter,
}

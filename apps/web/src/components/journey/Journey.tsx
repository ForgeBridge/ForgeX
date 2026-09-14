'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ForgeCanvas } from '../hero/ForgeCanvas'
import { TickerBar } from '../tokens/TickerBar'
import { SoundControl } from '../ui/SoundControl'
import { CHAPTERS, BOARD_INDEX, useJourneyStore } from './useJourney'
import { CHAPTER_COMPONENTS } from './chapters'

/**
 * Blank immersive journey shell (AuraSea flow, ForgeX skin):
 * full-viewport canvas, minimal chrome, one chapter at a time.
 */
export function Journey() {
  const { index, next, back, goTo, reset, pulse } = useJourneyStore()
  const current = CHAPTERS[index] ?? CHAPTERS[0]
  const Chapter = CHAPTER_COMPONENTS[current.id]
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)

  // Move screen-reader/keyboard focus to the new chapter heading.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    mainRef.current?.querySelector<HTMLElement>('h1, h2')?.focus()
  }, [index])

  // Arrow keys move through chapters (never hijack form fields).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement
      )
        return
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') back()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [next, back])

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <ForgeCanvas className="absolute inset-0 h-full w-full" pulseTrigger={pulse} />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/20 to-background"
      />

      <TickerBar />

      <header className="relative border-b border-border/60 bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={reset}
            aria-label="ForgeX home — restart journey"
            className="flex items-center gap-2 rounded-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-forge">
              <svg
                aria-hidden="true"
                className="h-4 w-4 text-forge-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              ForgeX
            </span>
          </button>

          <a
            href="https://github.com/ForgeBridge/ForgeX"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Follow the build
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path d="M6 18L18 6M6 6h12v12" />
            </svg>
          </a>

          <SoundControl />
        </div>
      </header>

      <main
        ref={mainRef}
        className="relative flex flex-1 items-center justify-center px-4 py-16"
      >
        {index > 0 && (
          <button
            type="button"
            onClick={back}
            className="absolute left-4 top-6 inline-flex min-h-[44px] items-center gap-1 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:left-8"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75"
              />
            </svg>
            Back
          </button>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-3xl"
          >
            {Chapter ? <Chapter /> : null}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="relative border-t border-border/60 bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <span className="shrink-0">© {new Date().getFullYear()} ForgeX</span>

          <div
            role="group"
            aria-label="Journey chapters"
            className="flex items-center"
          >
            {CHAPTERS.map((chapter, i) => (
              <button
                key={chapter.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to chapter ${i + 1}: ${chapter.title}`}
                aria-current={i === index ? 'step' : undefined}
                className="flex min-h-[44px] items-center justify-center px-2.5"
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i === index
                      ? 'bg-forge'
                      : i < index
                        ? 'bg-muted-foreground'
                        : 'bg-border hover:bg-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => goTo(BOARD_INDEX)}
              className="min-h-[44px] rounded-md px-2 font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Board
            </button>
            <span className="hidden sm:inline">Live on Stellar Testnet</span>
          </div>
        </div>
      </footer>

      <div role="status" className="sr-only">
        Chapter {index + 1} of {CHAPTERS.length}: {current.title}
      </div>
    </div>
  )
}

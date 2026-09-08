'use client'

import { Button } from '../ui/Button'
import { useJourneyStore } from './useJourney'

export function OpeningChapter() {
  const { next } = useJourneyStore()

  return (
    <div className="text-center">
      <div className="mx-auto mb-8 flex h-[88px] w-[88px] items-center justify-center rounded-[22px] bg-forge shadow-elevated">
        <svg
          aria-hidden="true"
          className="h-10 w-10 text-forge-foreground"
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
      </div>

      <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
        THE MEMECOIN LAUNCHPAD ON STELLAR
      </p>

      <h1
        tabIndex={-1}
        className="font-display mt-4 text-6xl font-extrabold tracking-tight text-foreground sm:text-8xl focus:outline-none"
      >
        ForgeX<span aria-hidden="true" className="text-forge">.</span>
      </h1>

      <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
        Your token. Your curve. Your beginning.
      </p>

      <div className="mt-8">
        <Button size="lg" onClick={next} className="gap-2">
          Start
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
              d="M6 18L18 6M6 6h12v12"
            />
          </svg>
        </Button>
      </div>
    </div>
  )
}

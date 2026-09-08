'use client'

import Link from 'next/link'
import { Button } from '../ui/Button'
import { useJourneyStore } from './useJourney'

export function ForgeChapter() {
  const { next } = useJourneyStore()

  return (
    <div className="text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
        LAUNCH IN UNDER A MINUTE
      </p>

      <h2
        tabIndex={-1}
        className="font-display mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl focus:outline-none"
      >
        Forge your token.
      </h2>

      <p className="mx-auto mt-4 max-w-md leading-relaxed text-muted-foreground">
        Pick a name, pick a ticker, set the supply. Your bonding curve deploys
        on Soroban and trading opens on block one.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/create">
          <Button size="lg" variant="forge">
            Forge a Token
          </Button>
        </Link>
        <Button size="lg" variant="secondary" onClick={next}>
          See what&apos;s live
        </Button>
      </div>
    </div>
  )
}

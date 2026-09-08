'use client'

import Link from 'next/link'
import { Button } from '../ui/Button'
import { WalletConnect } from '../wallet/WalletConnect'
import { useJourneyStore } from './useJourney'

export function BeginChapter() {
  const { reset } = useJourneyStore()

  return (
    <div className="text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
        THE FIRST BLOCK IS YOURS
      </p>

      <h2
        tabIndex={-1}
        className="font-display mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl focus:outline-none"
      >
        Your beginning.
      </h2>

      <p className="mx-auto mt-4 max-w-md leading-relaxed text-muted-foreground">
        Connect your Stellar wallet to forge and trade. No signup, no deposit —
        just the curve.
      </p>

      <div className="mt-8 flex justify-center">
        <WalletConnect />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/explore">
          <Button size="lg">Explore Tokens</Button>
        </Link>
        <Link href="/create">
          <Button size="lg" variant="forge">
            Forge a Token
          </Button>
        </Link>
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={reset}
          className="min-h-[44px] rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Replay the journey
        </button>
      </div>
    </div>
  )
}

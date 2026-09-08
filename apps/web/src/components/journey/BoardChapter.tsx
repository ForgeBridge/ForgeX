'use client'

import { TokenFeed } from '../tokens/TokenFeed'
import { Button } from '../ui/Button'
import { useJourneyStore } from './useJourney'

export function BoardChapter() {
  const { next } = useJourneyStore()

  return (
    <div>
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
          LIVE ON THE CURVE
        </p>

        <h2
          tabIndex={-1}
          className="font-display mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl focus:outline-none"
        >
          The board.
        </h2>

        <p className="mx-auto mt-4 max-w-md leading-relaxed text-muted-foreground">
          Every token, ranked by the market. Pick one to trade.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-3xl">
        <TokenFeed pageSize={6} />
      </div>

      <div className="mt-8 text-center">
        <Button size="lg" variant="secondary" onClick={next}>
          Continue
        </Button>
      </div>
    </div>
  )
}

'use client'

import { Button } from '../ui/Button'
import { useJourneyStore } from './useJourney'

const beats = [
  {
    value: 'P₀',
    title: 'Every token starts from zero',
    description:
      'No presale, no insiders. The price is a pure function of supply sold.',
  },
  {
    value: 'e^',
    title: 'Price moves with every trade',
    description:
      'Buys push the curve up, sells bring it back. The market never sleeps.',
  },
  {
    value: '⇄',
    title: 'Sell back any time',
    description:
      'The reserve is the liquidity. Exit into XLM whenever you choose.',
  },
]

export function CurveChapter() {
  const { next } = useJourneyStore()

  return (
    <div className="text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
        HOW IT WORKS
      </p>

      <h2
        tabIndex={-1}
        className="font-display mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl focus:outline-none"
      >
        The curve is the market<span aria-hidden="true" className="text-forge">.</span>
      </h2>

      <p className="mx-auto mt-4 max-w-md leading-relaxed text-muted-foreground">
        No liquidity pools. No market makers. Just one exponential curve doing
        the work.
      </p>

      <div className="mx-auto mt-10 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
        {beats.map((beat) => (
          <div
            key={beat.title}
            className="rounded-lg border border-border bg-card/70 p-4 backdrop-blur-sm"
          >
            <div aria-hidden="true" className="font-mono text-xl font-bold text-forge">
              {beat.value}
            </div>
            <h3 className="mt-2 text-sm font-semibold text-foreground">
              {beat.title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {beat.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Button size="lg" onClick={next}>
          Continue
        </Button>
      </div>
    </div>
  )
}

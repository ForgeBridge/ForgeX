'use client'

import { BuyForm } from './BuyForm'
import { SellForm } from './SellForm'

export function TradePanel() {
  return (
    <div className="bg-[var(--forgex-surface)] rounded-lg border border-[var(--forgex-border)] p-4">
      <div className="flex border-b border-[var(--forgex-border)] mb-4">
        <button className="px-4 py-2 text-sm font-medium text-[var(--forgex-primary)] border-b-2 border-[var(--forgex-primary)]">
          Buy
        </button>
        <button className="px-4 py-2 text-sm font-medium text-[var(--forgex-text-muted)]">
          Sell
        </button>
      </div>
      <BuyForm />
    </div>
  )
}

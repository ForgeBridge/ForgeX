'use client'

export interface TickerItem {
  symbol: string
  price: string
  change: string
  up: boolean
}

const DEFAULT_ITEMS: TickerItem[] = [
  { symbol: 'FDEMO', price: '0.00012 XLM', change: '+18.4%', up: true },
  { symbol: 'FORGE', price: '0.00089 XLM', change: '+6.2%', up: true },
  { symbol: 'STELLR', price: '0.00041 XLM', change: '-2.1%', up: false },
  { symbol: 'LUMEN', price: '0.00120 XLM', change: '+11.7%', up: true },
  { symbol: 'ANVIL', price: '0.00007 XLM', change: '+32.9%', up: true },
  { symbol: 'EMBER', price: '0.00055 XLM', change: '-0.8%', up: false },
]

export function TickerBar({ items = DEFAULT_ITEMS }: { items?: TickerItem[] }) {
  const row = [...items, ...items]
  return (
    <div
      aria-label="Trending token prices"
      className="overflow-hidden border-b border-border bg-card/60"
    >
      <div className="forgex-ticker-track items-center gap-8 px-4 py-2">
        {row.map((item, i) => (
          <span
            key={`${item.symbol}-${i}`}
            aria-hidden={i >= items.length}
            className="inline-flex items-center gap-2 text-xs whitespace-nowrap"
          >
            <span className="font-mono font-bold text-foreground">
              ${item.symbol}
            </span>
            <span className="font-mono text-muted-foreground tnum">
              {item.price}
            </span>
            <span
              className={`font-mono font-semibold tnum ${
                item.up ? 'text-success' : 'text-destructive'
              }`}
            >
              {item.change}
            </span>
            <span aria-hidden="true" className="text-border">
              /
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

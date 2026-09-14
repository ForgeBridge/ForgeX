'use client'

export interface TickerItem {
  symbol: string
  price: string
  change: string
  up: boolean
  /** Whether this token has graduated to DEX */
  graduated?: boolean
  /** Optional volume display */
  volume?: string
}

const DEFAULT_ITEMS: TickerItem[] = [
  { symbol: 'FORGE', price: '0.00284 XLM', change: '+24.8%', up: true },
  { symbol: 'AURA', price: '0.000012 XLM', change: '+34.2%', up: true },
  {
    symbol: 'SPRX',
    price: '0.000247 XLM',
    change: 'GRADUATED (DEX)',
    up: true,
    graduated: true,
    volume: '48.2k XLM',
  },
  { symbol: 'SDOGE', price: '0.0000084 XLM', change: '-4.3%', up: false },
  { symbol: 'NBX', price: '0.000029 XLM', change: '+18.2%', up: true },
  { symbol: 'CRNO', price: '0.000015 XLM', change: '+8.7%', up: true },
]

export function TickerBar({ items = DEFAULT_ITEMS }: { items?: TickerItem[] }) {
  const row = [...items, ...items]
  return (
    <div
      aria-label="Live token prices and network status"
      className="overflow-hidden border-b border-border bg-muted/40 py-1"
    >
      <div className="forgex-ticker-track items-center gap-8 px-4 text-[11px] font-mono select-none">
        {/* Network status prefix */}
        <span className="inline-flex items-center gap-1.5 text-foreground shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-forge font-bold">SOROBAN TESTNET:</span>
          <span>Block #48,921,802</span>
        </span>

        {row.map((item, i) => (
          <span
            key={`${item.symbol}-${i}`}
            aria-hidden={i >= items.length}
            className="inline-flex items-center gap-2 whitespace-nowrap"
          >
            <span className="font-semibold text-foreground">
              ${item.symbol}:
            </span>
            {item.graduated ? (
              <span className="text-forge font-semibold">
                {item.change}
              </span>
            ) : (
              <>
                <span className="text-muted-foreground tnum">
                  {item.price}
                </span>
                <span
                  className={`font-semibold tnum ${
                    item.up ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {item.up ? '▲' : '▼'} {item.change}
                </span>
              </>
            )}
            {item.volume && (
              <span className="text-muted-foreground">
                Vol: {item.volume}
              </span>
            )}
          </span>
        ))}

        {/* Network stats suffix */}
        <span className="inline-flex items-center gap-1 text-muted-foreground shrink-0">
          <svg
            className="w-3 h-3 text-forge"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
            />
          </svg>
          <span>Avg Finality: 3.8s</span>
        </span>
      </div>
    </div>
  )
}

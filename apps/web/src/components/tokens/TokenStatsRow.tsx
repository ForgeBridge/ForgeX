'use client'

export interface TokenStats {
  price: string
  priceChange24h?: number
  marketCap: string
  reserveBalance: string
  totalSupply: string
  circulatingSupply: string
  volume24h?: string
  tradeCount24h?: number
  graduationThreshold?: string
}

export interface TokenStatsRowProps {
  stats: TokenStats
}

export function TokenStatsRow({ stats }: TokenStatsRowProps) {
  const reserveNum = parseFloat(stats.reserveBalance.replace(/,/g, '')) || 0
  const gradNum =
    parseFloat((stats.graduationThreshold || '50000').replace(/,/g, '')) ||
    50000
  const graduationProgress = Math.min(
    100,
    Math.max(0, (reserveNum / gradNum) * 100)
  )

  const isPositiveChange = (stats.priceChange24h ?? 0) >= 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-card rounded-lg border border-border p-3.5">
          <div className="text-[11px] text-muted-foreground font-medium mb-1">
            Price (XLM)
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-bold font-mono text-foreground">
              {stats.price}
            </span>
            {stats.priceChange24h !== undefined && (
              <span
                className={`text-xs font-semibold ${
                  isPositiveChange ? 'text-success' : 'text-destructive'
                }`}
              >
                {isPositiveChange ? '+' : ''}
                {stats.priceChange24h.toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-3.5">
          <div className="text-[11px] text-muted-foreground font-medium mb-1">
            Market Cap
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            {stats.marketCap}{' '}
            <span className="text-xs font-normal text-muted-foreground">
              XLM
            </span>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-3.5">
          <div className="text-[11px] text-muted-foreground font-medium mb-1">
            Curve Reserve
          </div>
          <div className="text-lg font-bold font-mono text-primary">
            {stats.reserveBalance}{' '}
            <span className="text-xs font-normal text-muted-foreground">
              XLM
            </span>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-3.5">
          <div className="text-[11px] text-muted-foreground font-medium mb-1">
            24h Volume
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            {stats.volume24h || '0'}{' '}
            <span className="text-xs font-normal text-muted-foreground">
              XLM
            </span>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-3.5 col-span-2 sm:col-span-1">
          <div className="text-[11px] text-muted-foreground font-medium mb-1">
            24h Swaps
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            {stats.tradeCount24h ?? 0}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-3.5 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground font-medium">
            Graduation Progress
          </span>
          <span className="font-semibold font-mono text-foreground">
            {graduationProgress.toFixed(1)}% ({stats.reserveBalance} /{' '}
            {stats.graduationThreshold || '50,000'} XLM)
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            role="progressbar"
            aria-valuenow={graduationProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Graduation progress"
            className="bg-primary h-full transition-all duration-500 rounded-full"
            style={{ width: `${graduationProgress}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          When reserve reaches 100%, liquidity graduates to Stellar DEX AMM
          pool.
        </p>
      </div>
    </div>
  )
}

'use client'

export interface TokenStats {
  price: string // in XLM
  priceChange24h?: number // percentage e.g. +5.4 or -2.1
  marketCap: string // in XLM
  reserveBalance: string // in XLM
  totalSupply: string
  circulatingSupply: string
  volume24h?: string // in XLM
  tradeCount24h?: number
  graduationThreshold?: string // in XLM (e.g. 50,000 XLM reserve)
}

export interface TokenStatsRowProps {
  stats: TokenStats
}

export function TokenStatsRow({ stats }: TokenStatsRowProps) {
  const reserveNum = parseFloat(stats.reserveBalance.replace(/,/g, '')) || 0
  const gradNum = parseFloat((stats.graduationThreshold || '50000').replace(/,/g, '')) || 50000
  const graduationProgress = Math.min(100, Math.max(0, (reserveNum / gradNum) * 100))

  const isPositiveChange = (stats.priceChange24h ?? 0) >= 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Current Price */}
        <div className="bg-[var(--forgex-surface)] rounded-xl border border-[var(--forgex-border)] p-4">
          <div className="text-xs text-[var(--forgex-text-muted)] font-medium mb-1">
            Price (XLM)
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg sm:text-xl font-bold font-mono text-[var(--forgex-text)]">
              {stats.price}
            </span>
            {stats.priceChange24h !== undefined && (
              <span
                className={`text-xs font-semibold ${
                  isPositiveChange ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPositiveChange ? '+' : ''}
                {stats.priceChange24h.toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        {/* Market Cap */}
        <div className="bg-[var(--forgex-surface)] rounded-xl border border-[var(--forgex-border)] p-4">
          <div className="text-xs text-[var(--forgex-text-muted)] font-medium mb-1">
            Market Cap
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-[var(--forgex-text)]">
            {stats.marketCap} <span className="text-xs font-normal text-[var(--forgex-text-muted)]">XLM</span>
          </div>
        </div>

        {/* Reserve Balance */}
        <div className="bg-[var(--forgex-surface)] rounded-xl border border-[var(--forgex-border)] p-4">
          <div className="text-xs text-[var(--forgex-text-muted)] font-medium mb-1">
            Curve Reserve
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-[var(--forgex-primary)]">
            {stats.reserveBalance} <span className="text-xs font-normal text-[var(--forgex-text-muted)]">XLM</span>
          </div>
        </div>

        {/* 24h Volume */}
        <div className="bg-[var(--forgex-surface)] rounded-xl border border-[var(--forgex-border)] p-4">
          <div className="text-xs text-[var(--forgex-text-muted)] font-medium mb-1">
            24h Volume
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-[var(--forgex-text)]">
            {stats.volume24h || '0'} <span className="text-xs font-normal text-[var(--forgex-text-muted)]">XLM</span>
          </div>
        </div>

        {/* 24h Trades */}
        <div className="bg-[var(--forgex-surface)] rounded-xl border border-[var(--forgex-border)] p-4 col-span-2 sm:col-span-1">
          <div className="text-xs text-[var(--forgex-text-muted)] font-medium mb-1">
            24h Swaps
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-[var(--forgex-text)]">
            {stats.tradeCount24h ?? 0}
          </div>
        </div>
      </div>

      {/* Graduation Progress Bar */}
      <div className="bg-[var(--forgex-surface)] rounded-xl border border-[var(--forgex-border)] p-4 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[var(--forgex-text-muted)] font-medium">
            Bonding Curve Graduation Progress
          </span>
          <span className="font-semibold font-mono text-[var(--forgex-text)]">
            {graduationProgress.toFixed(1)}% ({stats.reserveBalance} / {stats.graduationThreshold || '50,000'} XLM)
          </span>
        </div>
        <div className="w-full bg-[var(--forgex-bg)] rounded-full h-2.5 overflow-hidden border border-[var(--forgex-border)]">
          <div
            role="progressbar"
            aria-valuenow={graduationProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Graduation progress"
            className="bg-gradient-to-r from-amber-500 to-[var(--forgex-primary)] h-full transition-all duration-500 rounded-full"
            style={{ width: `${graduationProgress}%` }}
          />
        </div>
        <p className="text-[11px] text-[var(--forgex-text-muted)]">
          When reserve reaches 100%, liquidity will automatically graduate to the Stellar DEX AMM pool.
        </p>
      </div>
    </div>
  )
}

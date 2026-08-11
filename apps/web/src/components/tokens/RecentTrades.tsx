'use client'

import { formatCurrency, formatNumber, formatTimeAgo, truncateAddress } from '../../lib/format'

export interface TradeItem {
  id: string
  type: 'buy' | 'sell'
  tokenAmount: string
  xlmAmount: string
  price: string
  account: string
  timestamp: number
  txHash?: string
}

export interface RecentTradesProps {
  trades?: TradeItem[]
  tokenSymbol?: string
  network?: string
  loading?: boolean
}

export function RecentTrades({
  trades = [],
  tokenSymbol = 'TOKEN',
  network = 'testnet',
  loading = false,
}: RecentTradesProps) {
  if (loading) {
    return (
      <div className="bg-[var(--forgex-surface)] rounded-2xl border border-[var(--forgex-border)] p-6 space-y-4">
        <h3 className="text-base font-bold text-[var(--forgex-text)]">Recent Trades</h3>
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-[var(--forgex-border)]/40 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--forgex-surface)] rounded-2xl border border-[var(--forgex-border)] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[var(--forgex-text)]">Recent Trades</h3>
        <span className="text-xs text-[var(--forgex-text-muted)] font-mono">
          {trades.length} {trades.length === 1 ? 'trade' : 'trades'}
        </span>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-10 px-4 text-xs text-[var(--forgex-text-muted)] border border-dashed border-[var(--forgex-border)]/60 rounded-xl">
          No trades recorded for this token yet. Be the first to buy!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[var(--forgex-border)] text-[var(--forgex-text-muted)] font-sans font-medium">
                <th className="pb-2">Type</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Total XLM</th>
                <th className="pb-2 hidden sm:table-cell">Price</th>
                <th className="pb-2">Account</th>
                <th className="pb-2 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--forgex-border)]/40">
              {trades.map((trade) => {
                const isBuy = trade.type === 'buy'
                return (
                  <tr key={trade.id} className="hover:bg-[var(--forgex-bg)]/40 transition-colors">
                    <td className="py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isBuy
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {trade.type}
                      </span>
                    </td>
                    <td className="py-2.5 font-semibold text-[var(--forgex-text)]">
                      {formatNumber(trade.tokenAmount)} {tokenSymbol}
                    </td>
                    <td className="py-2.5 text-[var(--forgex-text-muted)]">
                      {formatCurrency(trade.xlmAmount, 'XLM')}
                    </td>
                    <td className="py-2.5 text-[var(--forgex-text-muted)] hidden sm:table-cell">
                      {trade.price} XLM
                    </td>
                    <td className="py-2.5">
                      <a
                        href={`https://stellar.expert/explorer/${network}/account/${trade.account}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--forgex-text-muted)] hover:text-[var(--forgex-primary)] transition-colors underline decoration-dotted"
                      >
                        {truncateAddress(trade.account, 4, 4)}
                      </a>
                    </td>
                    <td className="py-2.5 text-right text-[var(--forgex-text-muted)]">
                      {formatTimeAgo(trade.timestamp)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

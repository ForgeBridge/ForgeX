'use client'

import { motion } from 'framer-motion'
import {
  formatCurrency,
  formatNumber,
  formatTimeAgo,
  truncateAddress,
} from '../../lib/format'

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
      <div className="bg-card rounded-lg border border-border p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Recent Trades</h3>
        <div className="space-y-2 animate-pulse-subtle">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted rounded-md" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent Trades</h3>
        <span className="text-xs text-muted-foreground font-mono">
          {trades.length} {trades.length === 1 ? 'trade' : 'trades'}
        </span>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-10 text-xs text-muted-foreground border border-dashed border-border rounded-md">
          No trades yet. Be the first to trade!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border text-muted-foreground font-sans font-medium">
                <th className="pb-2">Type</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Total XLM</th>
                <th className="pb-2 hidden sm:table-cell">Price</th>
                <th className="pb-2">Account</th>
                <th className="pb-2 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {trades.map((trade, i) => {
                const isBuy = trade.type === 'buy'
                return (
                  <motion.tr
                    key={trade.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-2.5">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isBuy
                            ? 'bg-success/10 text-success border border-success/20'
                            : 'bg-destructive/10 text-destructive border border-destructive/20'
                        }`}
                      >
                        {trade.type}
                      </span>
                    </td>
                    <td className="py-2.5 font-semibold text-foreground">
                      {formatNumber(trade.tokenAmount)} {tokenSymbol}
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {formatCurrency(trade.xlmAmount, 'XLM')}
                    </td>
                    <td className="py-2.5 text-muted-foreground hidden sm:table-cell">
                      {trade.price} XLM
                    </td>
                    <td className="py-2.5">
                      <a
                        href={`https://stellar.expert/explorer/${network}/account/${trade.account}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors underline decoration-dotted"
                      >
                        {truncateAddress(trade.account, 4, 4)}
                      </a>
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {formatTimeAgo(trade.timestamp)}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

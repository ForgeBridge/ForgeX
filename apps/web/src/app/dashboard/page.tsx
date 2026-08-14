'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useWalletStore } from '../../hooks/useWallet'
import { Button } from '../../components/ui/Button'
import { TokenAvatar } from '../../components/tokens/TokenAvatar'

interface Position {
  tokenId: string
  name: string
  symbol: string
  balance: string
  valueXLM: string
  entryPrice: string
  currentPrice: string
  pnl: number
}

interface TradeHistory {
  id: string
  type: 'buy' | 'sell'
  tokenSymbol: string
  amount: string
  xlmAmount: string
  timestamp: number
}

const mockPositions: Position[] = [
  {
    tokenId: 'tok_1',
    name: 'Stellar Doge',
    symbol: 'SDOGE',
    balance: '125,000',
    valueXLM: '15.62',
    entryPrice: '0.0001',
    currentPrice: '0.000125',
    pnl: 25.0,
  },
  {
    tokenId: 'tok_2',
    name: 'Soroban Token',
    symbol: 'SORO',
    balance: '50,000',
    valueXLM: '5.00',
    entryPrice: '0.0001',
    currentPrice: '0.0001',
    pnl: 0,
  },
]

const mockHistory: TradeHistory[] = [
  { id: '1', type: 'buy', tokenSymbol: 'SDOGE', amount: '25,000', xlmAmount: '2.50', timestamp: Date.now() / 1000 - 3600 },
  { id: '2', type: 'sell', tokenSymbol: 'SORO', amount: '10,000', xlmAmount: '1.00', timestamp: Date.now() / 1000 - 7200 },
  { id: '3', type: 'buy', tokenSymbol: 'SDOGE', amount: '100,000', xlmAmount: '10.00', timestamp: Date.now() / 1000 - 86400 },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
}

export default function DashboardPage() {
  const router = useRouter()
  const { isConnected, address, balance, connect } = useWalletStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (mounted && !isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto space-y-6"
        >
          <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto border border-border">
            <svg className="w-7 h-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">Connect Your Wallet</h1>
          <p className="text-sm text-muted-foreground">
            Connect your Freighter wallet to view your portfolio and trade history.
          </p>
          <Button onClick={() => router.push('/auth')}>Connect Wallet</Button>
        </motion.div>
      </div>
    )
  }

  const totalValue = mockPositions.reduce((sum, p) => sum + parseFloat(p.valueXLM), 0)
  const totalPnl = mockPositions.reduce((sum, p) => sum + (parseFloat(p.valueXLM) * p.pnl) / 100, 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your portfolio and trading activity
            </p>
          </div>
          <Link href="/create">
            <Button size="sm">Create Token</Button>
          </Link>
        </div>

        {/* Stats */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <motion.div variants={item} className="bg-card rounded-lg border border-border p-5">
            <div className="text-xs text-muted-foreground font-medium mb-1">Portfolio Value</div>
            <div className="text-2xl font-bold font-mono text-foreground">{totalValue.toFixed(2)} XLM</div>
            <div className="text-xs text-muted-foreground mt-1">XLM Balance: {balance || '...'} XLM</div>
          </motion.div>
          <motion.div variants={item} className="bg-card rounded-lg border border-border p-5">
            <div className="text-xs text-muted-foreground font-medium mb-1">Total P&L</div>
            <div className={`text-2xl font-bold font-mono ${totalPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} XLM
            </div>
          </motion.div>
          <motion.div variants={item} className="bg-card rounded-lg border border-border p-5">
            <div className="text-xs text-muted-foreground font-medium mb-1">Active Positions</div>
            <div className="text-2xl font-bold font-mono text-foreground">{mockPositions.length}</div>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Positions */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg border border-border">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Positions</h2>
              </div>
              {mockPositions.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No positions yet. Start trading!
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {mockPositions.map((pos) => (
                    <Link
                      key={pos.tokenId}
                      href={`/token/${pos.tokenId}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <TokenAvatar symbol={pos.symbol} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-foreground">{pos.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">${pos.symbol}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-medium text-foreground">{pos.balance}</div>
                        <div className="text-xs text-muted-foreground">≈ {pos.valueXLM} XLM</div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <div className={`text-sm font-mono font-semibold ${pos.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toFixed(1)}%
                        </div>
                        <div className="text-[11px] text-muted-foreground">P&L</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent History */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg border border-border">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Recent Trades</h2>
              </div>
              <div className="divide-y divide-border">
                {mockHistory.map((trade) => (
                  <div key={trade.id} className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          trade.type === 'buy'
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {trade.type}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {trade.xlmAmount} XLM
                      </span>
                    </div>
                    <div className="text-xs text-foreground font-medium">
                      {trade.amount} ${trade.tokenSymbol}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

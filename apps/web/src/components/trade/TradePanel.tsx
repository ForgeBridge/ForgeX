'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { Address } from 'viem'

// Loaded on demand: the Arc form is the only place viem and the EVM SDK enter
// the bundle, and per AGENTS.md neither the layout nor shared components may
// pull a chain dependency into every page.
const ArcTradeForm = dynamic(() => import('./ArcTradeForm').then((m) => m.ArcTradeForm), {
  ssr: false,
  loading: () => (
    <div className="bg-card rounded-lg border border-border p-4 h-64 animate-pulse" aria-busy="true" />
  ),
})

import { BuyForm } from './BuyForm'
import { SellForm } from './SellForm'
import { SlippageTolerance } from './SlippageTolerance'
import { RiskDisclaimer } from '../common/RiskDisclaimer'
import { useWalletStore } from '../../hooks/useWallet'
import { useChainStore } from '../../hooks/useEvmWalletStore'
import { getArcConfig } from '../../lib/arc'
import { Button } from '../ui/Button'
import Link from 'next/link'

export interface TradePanelProps {
  curveContractId?: string
  /** Arc curve address, used when the active chain is Arc. */
  curveAddress?: Address | string
  tokenSymbol?: string
  tokenDecimals?: number
  tokenPrice?: string
  userBalance?: string
  onTradeSuccess?: (result: { type: 'buy' | 'sell'; amount: string }) => void
}

export function TradePanel({
  curveContractId,
  curveAddress,
  tokenSymbol = 'TOKEN',
  tokenDecimals = 7,
  tokenPrice = '0.0001',
  userBalance = '0',
  onTradeSuccess,
}: TradePanelProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy')
  const { isConnected, connect } = useWalletStore()
  const activeChain = useChainStore((state) => state.activeChain)
  const arcConfig = getArcConfig()
  const arcCurveAddress = curveAddress && /^0x[0-9a-fA-F]{40}$/.test(curveAddress) ? (curveAddress as Address) : null
  const useArc = activeChain === 'arc' && Boolean(arcCurveAddress)

  if (useArc && arcCurveAddress) {
    return (
      <div className="space-y-3">
        <ArcTradeForm
          curveAddress={arcCurveAddress}
          tokenSymbol={tokenSymbol}
          tokenDecimals={tokenDecimals}
          userBalance={userBalance}
          onSuccess={(res) => onTradeSuccess?.({ type: res.type, amount: res.amount })}
        />
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-4">
      {!isConnected && (
        <div className="bg-muted border border-border rounded-md p-3 text-xs text-muted-foreground flex items-center justify-between gap-2">
          <span>Connect wallet to trade ${tokenSymbol}</span>
          <Link
            href="/auth"
            className="font-semibold text-primary hover:underline shrink-0"
          >
            Connect
          </Link>
        </div>
      )}

      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('buy')}
          className={`flex-1 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'buy'
              ? 'text-success border-success'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sell')}
          className={`flex-1 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'sell'
              ? 'text-destructive border-destructive'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          Sell
        </button>
      </div>

      {activeTab === 'buy' ? (
        <BuyForm
          curveContractId={curveContractId}
          tokenSymbol={tokenSymbol}
          tokenDecimals={tokenDecimals}
          tokenPrice={tokenPrice}
          onSuccess={(res) =>
            onTradeSuccess?.({ type: 'buy', amount: res.amount })
          }
        />
      ) : (
        <SellForm
          curveContractId={curveContractId}
          tokenSymbol={tokenSymbol}
          tokenDecimals={tokenDecimals}
          tokenPrice={tokenPrice}
          userBalance={userBalance}
          onSuccess={(res) =>
            onTradeSuccess?.({ type: 'sell', amount: res.amount })
          }
        />
      )}

      <div className="pt-3 border-t border-border space-y-3">
        <SlippageTolerance />
        <RiskDisclaimer />
      </div>
    </div>
  )
}

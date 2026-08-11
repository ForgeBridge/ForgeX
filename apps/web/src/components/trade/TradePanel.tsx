'use client'

import { useState } from 'react'
import { BuyForm } from './BuyForm'
import { SellForm } from './SellForm'
import { SlippageTolerance } from './SlippageTolerance'
import { RiskDisclaimer } from '../common/RiskDisclaimer'
import { useWalletStore } from '../../hooks/useWallet'
import { Button } from '../ui/Button'

export interface TradePanelProps {
  curveContractId?: string
  tokenSymbol?: string
  tokenDecimals?: number
  tokenPrice?: string
  userBalance?: string
  onTradeSuccess?: (result: { type: 'buy' | 'sell'; amount: string }) => void
}

export function TradePanel({
  curveContractId,
  tokenSymbol = 'TOKEN',
  tokenDecimals = 7,
  tokenPrice = '0.0001',
  userBalance = '0',
  onTradeSuccess,
}: TradePanelProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy')
  const { isConnected, connect } = useWalletStore()

  return (
    <div className="bg-[var(--forgex-surface)] rounded-xl border border-[var(--forgex-border)] p-5 shadow-sm space-y-4">
      {!isConnected && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300 flex items-center justify-between gap-2">
          <span>Connect Freighter wallet to trade ${tokenSymbol}</span>
          <button
            type="button"
            onClick={connect}
            className="font-semibold underline hover:text-amber-200 shrink-0"
          >
            Connect
          </button>
        </div>
      )}

      <div className="flex border-b border-[var(--forgex-border)]">
        <button
          type="button"
          onClick={() => setActiveTab('buy')}
          className={`flex-1 py-2 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'buy'
              ? 'text-[var(--forgex-primary)] border-[var(--forgex-primary)]'
              : 'text-[var(--forgex-text-muted)] border-transparent hover:text-[var(--forgex-text)]'
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sell')}
          className={`flex-1 py-2 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'sell'
              ? 'text-red-400 border-red-400'
              : 'text-[var(--forgex-text-muted)] border-transparent hover:text-[var(--forgex-text)]'
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
          onSuccess={(res) => onTradeSuccess?.({ type: 'buy', amount: res.amount })}
        />
      ) : (
        <SellForm
          curveContractId={curveContractId}
          tokenSymbol={tokenSymbol}
          tokenDecimals={tokenDecimals}
          tokenPrice={tokenPrice}
          userBalance={userBalance}
          onSuccess={(res) => onTradeSuccess?.({ type: 'sell', amount: res.amount })}
        />
      )}

      <div className="pt-2 border-t border-[var(--forgex-border)] space-y-3">
        <SlippageTolerance />
        <RiskDisclaimer />
      </div>
    </div>
  )
}

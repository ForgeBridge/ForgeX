'use client'

import { useState } from 'react'
import { BuyForm } from './BuyForm'
import { SellForm } from './SellForm'

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

  return (
    <div className="bg-[var(--forgex-surface)] rounded-lg border border-[var(--forgex-border)] p-4 shadow-sm">
      <div className="flex border-b border-[var(--forgex-border)] mb-4">
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
    </div>
  )
}

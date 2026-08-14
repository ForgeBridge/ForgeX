'use client'

import { useState } from 'react'
import { BuyForm } from './BuyForm'
import { SellForm } from './SellForm'
import { SlippageTolerance } from './SlippageTolerance'
import { RiskDisclaimer } from '../common/RiskDisclaimer'
import { useWalletStore } from '../../hooks/useWallet'
import { Button } from '../ui/Button'
import Link from 'next/link'

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

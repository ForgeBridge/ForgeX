'use client'

import { useMemo } from 'react'

export interface QuotePreviewProps {
  type: 'buy' | 'sell'
  tokenAmount: string
  tokenPrice: string
  tokenSymbol: string
  slippagePercent?: number
  feePercent?: number
}

export function QuotePreview({
  type,
  tokenAmount,
  tokenPrice,
  tokenSymbol,
  slippagePercent = 1,
  feePercent = 1,
}: QuotePreviewProps) {
  const quote = useMemo(() => {
    const amountNum = parseFloat(tokenAmount)
    const priceNum = parseFloat(tokenPrice)

    if (isNaN(amountNum) || isNaN(priceNum) || amountNum <= 0 || priceNum <= 0) {
      return null
    }

    const grossXLM = amountNum * priceNum
    const feeXLM = (grossXLM * feePercent) / 100
    const totalCostXLM =
      type === 'buy' ? grossXLM + feeXLM : Math.max(0, grossXLM - feeXLM)

    const minReceived =
      type === 'buy'
        ? (amountNum * (100 - slippagePercent)) / 100
        : (totalCostXLM * (100 - slippagePercent)) / 100

    const priceImpact = Math.min(15, (amountNum / 1000000) * 0.5)

    return {
      grossXLM: grossXLM.toFixed(6),
      feeXLM: feeXLM.toFixed(6),
      totalCostXLM: totalCostXLM.toFixed(6),
      minReceived: minReceived.toFixed(6),
      priceImpact: priceImpact.toFixed(2),
    }
  }, [type, tokenAmount, tokenPrice, slippagePercent, feePercent])

  if (!quote) return null

  return (
    <div
      aria-label="Quote Preview"
      className="bg-muted/50 border border-border rounded-md p-3 text-xs space-y-1.5"
    >
      <div className="flex justify-between items-center text-muted-foreground">
        <span>{type === 'buy' ? 'Est. Total Cost' : 'Est. Payout'}:</span>
        <span className="font-mono font-semibold text-foreground text-sm">
          {quote.totalCostXLM} XLM
        </span>
      </div>

      <div className="flex justify-between items-center text-muted-foreground">
        <span>Fee ({feePercent}%):</span>
        <span className="font-mono">{quote.feeXLM} XLM</span>
      </div>

      <div className="flex justify-between items-center text-muted-foreground">
        <span>{type === 'buy' ? 'Min Received' : 'Min XLM'}:</span>
        <span className="font-mono">
          {quote.minReceived} {type === 'buy' ? tokenSymbol : 'XLM'}
        </span>
      </div>

      <div className="flex justify-between items-center text-muted-foreground">
        <span>Price Impact:</span>
        <span
          className={`font-mono ${
            parseFloat(quote.priceImpact) > 5
              ? 'text-warning'
              : 'text-success'
          }`}
        >
          ~{quote.priceImpact}%
        </span>
      </div>
    </div>
  )
}

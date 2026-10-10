'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  applyBuySlippage,
  applySellSlippage,
  formatTokenAmount,
  formatQuoteAmount,
  parseTokenAmount,
  priceToQuote,
} from '@forgex/sdk-evm'

import { useToastStore } from '../../hooks/useToast'
import { useEvmWallet } from '../../hooks/useEvmWallet'
import { useEvmReader, useEvmWriter } from '../../hooks/useEvmClient'
import { useChainStore } from '../../hooks/useEvmWalletStore'
import { useTradeStore } from '../../hooks/useBondingCurve'
import { useEvmBuy, useEvmSell } from '../../hooks/useEvmTrade'
import { arcExplorerTxUrl, getArcConfig } from '../../lib/arc'
import { sanitizeNumericInput, validateTradeAmount } from '../../lib/inputGuards'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { QuotePreview } from './QuotePreview'
import { RiskDisclaimer } from '../common/RiskDisclaimer'

export interface ArcTradeFormProps {
  curveAddress: `0x${string}`
  tokenSymbol?: string
  tokenDecimals?: number
  userBalance?: string
  onSuccess?: (result: { type: 'buy' | 'sell'; amount: string; txHash: string }) => void
}

/**
 * Buy/sell panel for the Arc deployment.
 *
 * Kept separate from `BuyForm`/`SellForm` on purpose: the Stellar path is
 * untouched, and the two chains need different accounts, different quote maths
 * and different confirmation flows. `TradePanel` picks between them based on the
 * active chain.
 */
export function ArcTradeForm({
  curveAddress,
  tokenSymbol = 'TOKEN',
  tokenDecimals = 7,
  userBalance = '0',
  onSuccess,
}: ArcTradeFormProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const config = getArcConfig()
  const { addToast, updateToast } = useToastStore()

  const reader = useEvmReader(config)
  const wallet = useEvmWallet()
  const { setActiveChain } = useChainStore()
  const slippage = useTradeStore((state) => state.slippage)
  const triggerRefresh = useTradeStore((state) => state.triggerRefresh)

  const writer = useEvmWriter(config)
  const buy = useEvmBuy(writer, curveAddress)
  const sell = useEvmSell(writer, curveAddress)

  // Live on-chain state: price for the label, and a quote for the estimate.
  const [quote, setQuote] = useState<{ owed?: bigint; net?: bigint; price?: bigint }>({})
  useEffect(() => {
    if (!reader || !amount) return
    let cancelled = false
    const client = reader.client.curve(curveAddress)
    void (async () => {
      try {
        const amountBase = parseTokenAmount(amount, tokenDecimals)
        const [quoted, price] = await Promise.all([
          activeTab === 'buy' ? client.quoteBuy(amountBase) : client.quoteSell(amountBase),
          client.getPrice(),
        ])
        if (cancelled) return
        setQuote(activeTab === 'buy' ? { owed: quoted, price } : { net: quoted, price })
      } catch {
        if (!cancelled) setQuote({})
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reader, amount, tokenDecimals, activeTab, curveAddress])

  const quoteNumber = useMemo(() => {
    const base = activeTab === 'buy' ? quote.owed : quote.net
    if (base === undefined) return 0
    return Number(formatQuoteAmount(base))
  }, [activeTab, quote.owed, quote.net])

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(sanitizeNumericInput(event.target.value, tokenDecimals))
    if (error) setError(null)
  }

  const requiresConnect = !wallet.isConnected || wallet.isWrongNetwork

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const validation = validateTradeAmount(amount, { maxDecimals: tokenDecimals, tokenSymbol })
    if (!validation.isValid) {
      setError(validation.error || 'Invalid amount')
      return
    }

    if (requiresConnect) {
      if (wallet.isWrongNetwork) await wallet.switchChain()
      else await wallet.connect()
      return
    }

    const pendingToastId = addToast({
      type: 'pending',
      title: activeTab === 'buy' ? 'Buying tokens' : 'Selling tokens',
      message: `Submitting ${amount} ${tokenSymbol} to the curve…`,
    })

    const result =
      activeTab === 'buy'
        ? await buy.buy({ amountTokens: amount, decimals: tokenDecimals, slippagePercent: slippage })
        : await sell.sell({ amountTokens: amount, decimals: tokenDecimals, slippagePercent: slippage })

    if (result) {
      updateToast(pendingToastId, {
        type: 'success',
        title: activeTab === 'buy' ? 'Bought tokens' : 'Sold tokens',
        message: `Confirmed ${amount} ${tokenSymbol} on ${config.chain.name}`,
        txHash: result,
        explorerUrl: arcExplorerTxUrl(config, result),
        durationMs: 6000,
      })
      setAmount('')
      triggerRefresh()
      onSuccess?.({ type: activeTab, amount, txHash: result })
    } else {
      const message = buy.error ?? sell.error ?? 'The trade failed.'
      updateToast(pendingToastId, {
        type: 'error',
        title: 'Transaction Failed',
        message,
        durationMs: 7000,
      })
      setError(message)
    }
  }

  const isPending = buy.phase === 'buying' || buy.phase === 'approving' || sell.phase === 'selling'
  const phaseLabel =
    buy.phase === 'approving'
      ? 'Approving USDC…'
      : buy.phase === 'buying'
        ? 'Confirming buy…'
        : sell.phase === 'selling'
          ? 'Confirming sell…'
          : null

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-4">
      {wallet.isWrongNetwork && (
        <div className="bg-warning/10 border border-warning/20 text-warning p-2.5 rounded-md text-xs">
          Your wallet is on another network.{' '}
          <button type="button" className="font-semibold underline" onClick={wallet.switchChain}>
            Switch to {config.chain.name}
          </button>
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

      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div
            role="alert"
            className="bg-destructive/10 border border-destructive/20 text-destructive p-2.5 rounded-md text-xs"
          >
            {error}
          </div>
        )}

        <Input
          label={`Amount (${tokenSymbol})`}
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          value={amount}
          onChange={handleAmountChange}
          disabled={isPending}
          required
        />

        <div className="text-xs text-muted-foreground flex justify-between">
          <span>Curve price</span>
          <span className="font-mono text-foreground">
            {quote.price !== undefined ? `${priceToQuote(quote.price).toFixed(8)} USDC` : '—'}
          </span>
        </div>

        <QuotePreview
          type={activeTab}
          tokenAmount={amount}
          tokenPrice={quote.price !== undefined ? String(priceToQuote(quote.price)) : '0'}
          tokenSymbol={tokenSymbol}
          slippagePercent={slippage}
        />

        {activeTab === 'buy' && (
          <p className="text-[11px] text-muted-foreground">
            {quote.owed !== undefined
              ? `You will pay about ${formatQuoteAmount(quote.owed)} USDC, up to ${formatQuoteAmount(
                  applyBuySlippage(quote.owed, slippage),
                )} with your ${slippage}% slippage limit.`
              : 'Enter an amount to see the exact quote.'}
          </p>
        )}
        {activeTab === 'sell' && (
          <p className="text-[11px] text-muted-foreground">
            {quote.net !== undefined
              ? `You will receive at least ${formatQuoteAmount(
                  applySellSlippage(quote.net, slippage),
                )} USDC, out of about ${formatQuoteAmount(quote.net)}.`
              : 'Enter an amount to see the exact quote.'}
            {userBalance !== '0' && (
              <span className="block">
                Your balance: {userBalance} {tokenSymbol}
              </span>
            )}
          </p>
        )}

        {requiresConnect ? (
          <Button type="button" className="w-full" onClick={wallet.connect} disabled={wallet.isConnecting}>
            {wallet.isWrongNetwork ? `Switch to ${config.chain.name}` : 'Connect wallet to trade'}
          </Button>
        ) : (
          <Button
            type="submit"
            className="w-full bg-success text-white hover:bg-success/90"
            disabled={isPending || !amount || parseTokenAmountSafe(amount) <= 0}
          >
            {phaseLabel ?? `${activeTab === 'buy' ? 'Buy' : 'Sell'} ${tokenSymbol}`}
          </Button>
        )}

        {config.isNativeQuote && (
          <p className="text-[11px] text-muted-foreground">
            Curve settles in the native Arc gas token (USDC). Gas and quotes are both paid in USDC.
          </p>
        )}
      </form>

      <div className="pt-3 border-t border-border">
        <RiskDisclaimer />
      </div>

      <button
        type="button"
        onClick={() => setActiveChain('stellar')}
        className="text-[11px] text-muted-foreground hover:text-foreground underline"
      >
        Switch back to Stellar
      </button>
    </div>
  )
}

function parseTokenAmountSafe(amount: string): number {
  try {
    return Number(formatTokenAmount(parseTokenAmount(amount, 7), 7))
  } catch {
    return 0
  }
}

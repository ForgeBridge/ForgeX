'use client'

import { useCallback, useState } from 'react'

import {
  applyBuySlippage,
  applySellSlippage,
  deadlineFromNow,
  parseQuoteAmount,
  parseTokenAmount,
  type ForgeXEvmClient,
} from '@forgex/sdk-evm'
import { classifyError } from '@forgex/sdk-evm'

import { getArcConfig } from '../lib/arc'
import { useEvmWalletStore } from './useEvmWalletStore'

/** Steps a trade goes through, so the UI can show where it is. */
export type TradePhase = 'idle' | 'approving' | 'buying' | 'selling' | 'done'

export interface EvmTradeState {
  phase: TradePhase
  txHash: string | null
  error: string | null
}

/**
 * Executes a buy on an Arc curve.
 *
 * Two transactions when the curve settles in an ERC20 quote: approve, then buy.
 * The quote is read from the chain first so the exact amount can be attached,
 * which a native-quote curve requires and an ERC20 curve benefits from.
 */
export function useEvmBuy(client: ForgeXEvmClient | null, curveAddress: `0x${string}`) {
  const [state, setState] = useState<EvmTradeState>({ phase: 'idle', txHash: null, error: null })

  const buy = useCallback(
    async (params: { amountTokens: string; decimals: number; slippagePercent: number }) => {
      if (!client) {
        setState({ phase: 'idle', txHash: null, error: 'Connect a wallet to trade on Arc.' })
        return null
      }
      const config = getArcConfig()
      const transport = useEvmWalletStore.getState().transport
      if (!transport) {
        setState({ phase: 'idle', txHash: null, error: 'Connect a wallet to trade on Arc.' })
        return null
      }

      setState({ phase: 'idle', txHash: null, error: null })
      try {
        const amountOut = parseTokenAmount(params.amountTokens, params.decimals)
        const curve = client.curve(curveAddress)
        const [quotedOwed, quoteToken] = await Promise.all([curve.quoteBuy(amountOut), curve.quoteToken()])

        // Native curves take the payment as value; ERC20 curves pull it with
        // transferFrom and therefore need an approval first.
        if (!config.isNativeQuote) {
          const allowance = await curve.quoteAllowance(transport.account ?? '0x', quoteToken)
          if (allowance < quotedOwed) {
            setState({ phase: 'approving', txHash: null, error: null })
            await client.token(quoteToken).approve(curveAddress, quotedOwed)
          }
        }

        const maxCost = applyBuySlippage(quotedOwed, params.slippagePercent)
        const deadline = deadlineFromNow(600)

        setState({ phase: 'buying', txHash: null, error: null })
        const hash = await curve.buy(amountOut, maxCost, deadline, quoteToken)
        setState({ phase: 'done', txHash: hash, error: null })
        return hash
      } catch (err) {
        const classified = classifyError(err)
        setState({ phase: 'idle', txHash: null, error: classified.message })
        return null
      }
    },
    [client, curveAddress],
  )

  const reset = useCallback(() => setState({ phase: 'idle', txHash: null, error: null }), [])
  return { ...state, buy, reset }
}

/**
 * Executes a sell on an Arc curve. The payout is quoted first so `minPayout`
 * carries the user's slippage choice.
 */
export function useEvmSell(client: ForgeXEvmClient | null, curveAddress: `0x${string}`) {
  const [state, setState] = useState<EvmTradeState>({ phase: 'idle', txHash: null, error: null })

  const sell = useCallback(
    async (params: { amountTokens: string; decimals: number; slippagePercent: number }) => {
      if (!client) {
        setState({ phase: 'idle', txHash: null, error: 'Connect a wallet to trade on Arc.' })
        return null
      }
      setState({ phase: 'idle', txHash: null, error: null })
      try {
        const amountIn = parseTokenAmount(params.amountTokens, params.decimals)
        const curve = client.curve(curveAddress)
        const quotedNet = await curve.quoteSell(amountIn)
        const minPayout = applySellSlippage(quotedNet, params.slippagePercent)
        const deadline = deadlineFromNow(600)

        setState({ phase: 'selling', txHash: null, error: null })
        const hash = await curve.sell(amountIn, minPayout, deadline)
        setState({ phase: 'done', txHash: hash, error: null })
        return hash
      } catch (err) {
        const classified = classifyError(err)
        setState({ phase: 'idle', txHash: null, error: classified.message })
        return null
      }
    },
    [client, curveAddress],
  )

  const reset = useCallback(() => setState({ phase: 'idle', txHash: null, error: null }), [])
  return { ...state, sell, reset }
}

/** Converts a user-entered quote amount into a number for display helpers. */
export function toQuoteNumber(value: string): number {
  try {
    const parsed = Number(parseQuoteAmount(value))
    return Number.isFinite(parsed) ? parsed / 1e6 : 0
  } catch {
    return 0
  }
}

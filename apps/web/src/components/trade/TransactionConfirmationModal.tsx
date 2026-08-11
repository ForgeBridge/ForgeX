'use client'

import { useEffect, useRef } from 'react'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { truncateAddress } from '../../lib/format'

export interface OrderDetails {
  type: 'buy' | 'sell'
  tokenSymbol: string
  tokenAmount: string
  estimatedCostOrPayout: string
  minReceivedOrMaxCost: string
  fee: string
  slippagePercent: number
  accountAddress: string
}

export interface TransactionConfirmationModalProps {
  isOpen: boolean
  orderDetails: OrderDetails | null
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
}

export function TransactionConfirmationModal({
  isOpen,
  orderDetails,
  isSubmitting = false,
  onClose,
  onConfirm,
}: TransactionConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen || !orderDetails) return null

  const isBuy = orderDetails.type === 'buy'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-confirmation-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
    >
      <div
        ref={modalRef}
        className="bg-[var(--forgex-surface)] border border-[var(--forgex-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6"
      >
        <div className="flex justify-between items-center pb-3 border-b border-[var(--forgex-border)]">
          <h2 id="tx-confirmation-title" className="text-lg font-bold text-[var(--forgex-text)]">
            Confirm {isBuy ? 'Purchase' : 'Sale'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="text-[var(--forgex-text-muted)] hover:text-[var(--forgex-text)] p-1 transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Order Highlight */}
        <div className="bg-[var(--forgex-bg)] p-4 rounded-xl border border-[var(--forgex-border)] text-center space-y-1">
          <span className="text-xs text-[var(--forgex-text-muted)] uppercase tracking-wider font-semibold">
            You are {isBuy ? 'Buying' : 'Selling'}
          </span>
          <div className="text-2xl font-bold font-mono text-[var(--forgex-primary)]">
            {orderDetails.tokenAmount} ${orderDetails.tokenSymbol}
          </div>
          <div className="text-xs text-[var(--forgex-text-muted)]">
            ≈ {orderDetails.estimatedCostOrPayout} XLM
          </div>
        </div>

        {/* Details Breakdown */}
        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between py-1 border-b border-[var(--forgex-border)]/50">
            <span className="text-[var(--forgex-text-muted)]">
              {isBuy ? 'Max Cost (with slippage):' : 'Min Received (with slippage):'}
            </span>
            <span className="font-semibold font-mono text-[var(--forgex-text)]">
              {orderDetails.minReceivedOrMaxCost} XLM
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-[var(--forgex-border)]/50">
            <span className="text-[var(--forgex-text-muted)]">Slippage Tolerance:</span>
            <span className="font-semibold font-mono text-[var(--forgex-text)]">
              {orderDetails.slippagePercent}%
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-[var(--forgex-border)]/50">
            <span className="text-[var(--forgex-text-muted)]">Protocol & Network Fee:</span>
            <span className="font-semibold font-mono text-[var(--forgex-text)]">
              {orderDetails.fee} XLM
            </span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-[var(--forgex-text-muted)]">Signing Account:</span>
            <span className="font-mono text-[var(--forgex-text)]">
              {truncateAddress(orderDetails.accountAddress, 6, 6)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 flex items-center justify-center gap-2"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" color="text-white" />
                <span>Signing in Wallet…</span>
              </>
            ) : (
              <span>Confirm & Sign</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

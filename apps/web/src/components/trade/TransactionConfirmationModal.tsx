'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
      if (e.key === 'Escape' && !isSubmitting) onClose()
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

  return (
    <AnimatePresence>
      {isOpen && orderDetails && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tx-confirmation-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) onClose()
          }}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-card border border-border rounded-lg max-w-md w-full p-6 shadow-modal space-y-5"
          >
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <h2
                id="tx-confirmation-title"
                className="text-base font-semibold text-foreground"
              >
                Confirm {orderDetails.type === 'buy' ? 'Purchase' : 'Sale'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Close modal"
                className="text-muted-foreground hover:text-foreground p-1 transition-colors disabled:opacity-50 rounded"
              >
                ✕
              </button>
            </div>

            <div className="bg-muted/50 p-4 rounded-md border border-border text-center space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                You are {orderDetails.type === 'buy' ? 'Buying' : 'Selling'}
              </span>
              <div className="text-2xl font-bold font-mono text-foreground">
                {orderDetails.tokenAmount} ${orderDetails.tokenSymbol}
              </div>
              <div className="text-xs text-muted-foreground">
                ≈ {orderDetails.estimatedCostOrPayout} XLM
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">
                  {orderDetails.type === 'buy' ? 'Max Cost:' : 'Min Received:'}
                </span>
                <span className="font-semibold font-mono text-foreground">
                  {orderDetails.minReceivedOrMaxCost} XLM
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Slippage:</span>
                <span className="font-semibold font-mono text-foreground">
                  {orderDetails.slippagePercent}%
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Fee:</span>
                <span className="font-semibold font-mono text-foreground">
                  {orderDetails.fee} XLM
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Account:</span>
                <span className="font-mono text-foreground">
                  {truncateAddress(orderDetails.accountAddress, 6, 6)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
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
                    <Spinner size="sm" />
                    <span>Signing...</span>
                  </>
                ) : (
                  'Confirm & Sign'
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

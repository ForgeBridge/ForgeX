'use client'

import { useEffect, useRef, useState } from 'react'
import { useToastStore, ToastItem } from '../../hooks/useToast'
import { Spinner } from './Spinner'

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

interface ToastCardProps {
  toast: ToastItem
  onDismiss: () => void
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const [paused, setPaused] = useState(false)
  const remainingRef = useRef(toast.durationMs ?? 0)
  const lastDurationKey = useRef(`${toast.id}:${toast.durationMs ?? 0}`)
  const deadlineRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const durationKey = `${toast.id}:${toast.durationMs ?? 0}`
  if (lastDurationKey.current !== durationKey) {
    lastDurationKey.current = durationKey
    remainingRef.current = toast.durationMs ?? 0
  }

  // Hover/focus-pausable auto-dismiss countdown.
  useEffect(() => {
    const duration = toast.durationMs ?? 0
    if (!duration || duration <= 0) return
    if (paused) return
    deadlineRef.current = Date.now() + remainingRef.current
    timerRef.current = setTimeout(onDismiss, remainingRef.current)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      remainingRef.current = Math.max(
        0,
        deadlineRef.current - Date.now()
      )
    }
  }, [toast.durationMs, toast.id, paused, onDismiss])

  const borderColors = {
    info: 'border-l-primary',
    success: 'border-l-success',
    error: 'border-l-destructive',
    pending: 'border-l-warning',
  }

  const icons = {
    info: (
      <div aria-hidden="true" className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
        i
      </div>
    ),
    success: (
      <div aria-hidden="true" className="w-5 h-5 rounded-full bg-success/10 text-success flex items-center justify-center text-xs font-bold">
        ✓
      </div>
    ),
    error: (
      <div aria-hidden="true" className="w-5 h-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-xs font-bold">
        ✕
      </div>
    ),
    pending: (
      <div aria-hidden="true" className="w-5 h-5 flex items-center justify-center">
        <Spinner size="sm" />
      </div>
    ),
  }

  const role = toast.type === 'error' ? 'alert' : 'status'

  return (
    <div
      role={role}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`pointer-events-auto p-3.5 rounded-lg border border-border border-l-[3px] shadow-elevated bg-card flex items-start gap-3 animate-slide-up ${borderColors[toast.type]}`}
    >
      <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>

      <div className="flex-1 min-w-0 space-y-1">
        <h4 className="text-xs font-semibold text-foreground">{toast.title}</h4>
        {toast.message && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {toast.message}
          </p>
        )}
        {(toast.explorerUrl || toast.txHash) && (
          <div className="pt-0.5">
            <a
              href={
                toast.explorerUrl ||
                `https://stellar.expert/explorer/testnet/tx/${toast.txHash}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
            >
              <span>View on Stellar Expert</span>
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-muted-foreground hover:text-foreground p-1 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors rounded"
      >
        <svg
          aria-hidden="true"
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  )
}

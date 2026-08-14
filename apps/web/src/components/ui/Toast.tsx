'use client'

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
  const borderColors = {
    info: 'border-l-primary',
    success: 'border-l-success',
    error: 'border-l-destructive',
    pending: 'border-l-warning',
  }

  const icons = {
    info: (
      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
        i
      </div>
    ),
    success: (
      <div className="w-5 h-5 rounded-full bg-success/10 text-success flex items-center justify-center text-xs font-bold">
        ✓
      </div>
    ),
    error: (
      <div className="w-5 h-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-xs font-bold">
        ✕
      </div>
    ),
    pending: (
      <div className="w-5 h-5 flex items-center justify-center">
        <Spinner size="sm" />
      </div>
    ),
  }

  const role = toast.type === 'error' ? 'alert' : 'status'

  return (
    <div
      role={role}
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
        className="text-muted-foreground hover:text-foreground text-xs p-1 transition-colors rounded"
      >
        ✕
      </button>
    </div>
  )
}

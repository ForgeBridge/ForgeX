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
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

interface ToastCardProps {
  toast: ToastItem
  onDismiss: () => void
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const typeStyles = {
    info: 'border-blue-500/30 bg-[var(--forgex-surface)] text-[var(--forgex-text)]',
    success: 'border-emerald-500/40 bg-[var(--forgex-surface)] text-[var(--forgex-text)]',
    error: 'border-red-500/40 bg-[var(--forgex-surface)] text-[var(--forgex-text)]',
    pending: 'border-amber-500/40 bg-[var(--forgex-surface)] text-[var(--forgex-text)]',
  }

  const role = toast.type === 'error' ? 'alert' : 'status'

  return (
    <div
      role={role}
      className={`pointer-events-auto p-4 rounded-xl border shadow-xl flex items-start gap-3 transition-all transform translate-y-0 duration-300 animate-slideUp ${typeStyles[toast.type]}`}
    >
      <div className="shrink-0 mt-0.5">
        {toast.type === 'pending' && <Spinner size="sm" color="text-amber-400" />}
        {toast.type === 'success' && (
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
            ✓
          </div>
        )}
        {toast.type === 'error' && (
          <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">
            ✕
          </div>
        )}
        {toast.type === 'info' && (
          <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
            ℹ
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <h4 className="text-xs font-bold">{toast.title}</h4>
        {toast.message && (
          <p className="text-xs text-[var(--forgex-text-muted)] leading-relaxed">
            {toast.message}
          </p>
        )}
        {(toast.explorerUrl || toast.txHash) && (
          <div className="pt-1">
            <a
              href={toast.explorerUrl || `https://stellar.expert/explorer/testnet/tx/${toast.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[var(--forgex-primary)] hover:underline font-medium"
            >
              <span>View on Stellar Expert</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-[var(--forgex-text-muted)] hover:text-[var(--forgex-text)] text-xs p-1 transition-colors"
      >
        ✕
      </button>
    </div>
  )
}

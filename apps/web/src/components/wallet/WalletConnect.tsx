'use client'

import { useState } from 'react'
import { useWalletStore } from '../../hooks/useWallet'
import { truncateAddress } from '../../lib/format'
import { Button } from '../ui/Button'

export function WalletConnect() {
  const {
    address,
    balance,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    clearError,
  } = useWalletStore()

  const [copied, setCopied] = useState(false)

  const handleCopyAddress = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard fallback
    }
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {/* Balance Display Pill */}
        <div
          aria-label="Wallet balance"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--forgex-bg)] border border-[var(--forgex-border)] text-xs font-mono text-[var(--forgex-text)]"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--forgex-primary)]" />
          <span className="font-semibold">{balance !== null ? `${balance} XLM` : '...'}</span>
        </div>

        {/* Address Chip with Copy Button */}
        <div className="flex items-center gap-1 bg-[var(--forgex-bg)]/60 px-2 py-1 rounded-lg border border-[var(--forgex-border)]/60 text-xs font-mono">
          <span className="text-[var(--forgex-text-muted)]">
            {truncateAddress(address, 4, 4)}
          </span>
          <button
            type="button"
            onClick={handleCopyAddress}
            aria-label="Copy connected address"
            title={copied ? 'Copied address!' : 'Copy address'}
            className="p-0.5 text-[var(--forgex-text-muted)] hover:text-[var(--forgex-primary)] transition-colors focus:outline-none"
          >
            {copied ? (
              <span className="text-emerald-400 font-bold text-[11px]">✓</span>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            )}
          </button>
        </div>

        <Button variant="secondary" size="sm" onClick={disconnect}>
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span
          className="text-xs text-red-400 max-w-[200px] truncate cursor-pointer"
          title={error}
          onClick={clearError}
        >
          {error}
        </span>
      )}
      <Button
        size="sm"
        onClick={connect}
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting…' : 'Connect Wallet'}
      </Button>
    </div>
  )
}

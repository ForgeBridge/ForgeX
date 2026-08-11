'use client'

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

        <span className="text-xs font-mono text-[var(--forgex-text-muted)] hidden md:inline px-2 py-1 bg-[var(--forgex-bg)]/50 rounded border border-[var(--forgex-border)]/50">
          {truncateAddress(address, 4, 4)}
        </span>

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

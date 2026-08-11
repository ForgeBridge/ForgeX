'use client'

import { useWalletStore } from '../../hooks/useWallet'
import { truncateAddress } from '../../lib/format'
import { Button } from '../ui/Button'

export function WalletConnect() {
  const { address, isConnected, isConnecting, error, connect, disconnect, clearError } =
    useWalletStore()

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--forgex-text-muted)] hidden sm:inline">
          {truncateAddress(address)}
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

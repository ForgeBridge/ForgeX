'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../ui/Button'
import { useEvmWallet, formatEvmAddress } from '../../hooks/useEvmWallet'

/**
 * EVM wallet option on /auth, powered by the Reown AppKit modal.
 * Mount only when `isReownConfigured` (see EvmWalletGate usage).
 */
export function EvmWalletSection() {
  const router = useRouter()
  const { address, isConnected, isConnecting, chainName, openConnect, disconnect } =
    useEvmWallet()

  useEffect(() => {
    if (isConnected) router.push('/dashboard')
  }, [isConnected, router])

  if (isConnected && address) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-md border border-border bg-muted px-3 py-2.5">
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-foreground">
              {formatEvmAddress(address)}
            </p>
            {chainName && (
              <p className="text-xs text-muted-foreground">{chainName}</p>
            )}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 text-[11px] font-semibold text-success">
            <span aria-hidden="true">●</span> Connected
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={disconnect}
          className="w-full"
        >
          Disconnect EVM wallet
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={openConnect}
        disabled={isConnecting}
        className="w-full"
        size="lg"
      >
        {isConnecting ? 'Waiting for wallet…' : 'Connect EVM wallet'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        600+ wallets via Reown — MetaMask, Coinbase, Rainbow and more
      </p>
    </div>
  )
}

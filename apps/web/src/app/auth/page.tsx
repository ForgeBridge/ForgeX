'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useWalletStore } from '../../hooks/useWallet'
import { isReownConfigured } from '../../lib/reown'
import { Button } from '../../components/ui/Button'
import { EvmWalletSection } from '../../components/wallet/EvmWalletSection'

/** Gated so wagmi/AppKit hooks only mount when providers exist. */
function EvmWalletGate() {
  if (!isReownConfigured) {
    return (
      <div className="space-y-3">
        <Button type="button" disabled className="w-full" size="lg">
          Connect EVM wallet
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Set <span className="font-mono">NEXT_PUBLIC_REOWN_PROJECT_ID</span>{' '}
          to enable EVM wallets
        </p>
      </div>
    )
  }
  return <EvmWalletSection />
}

export default function AuthPage() {
  const router = useRouter()
  const { isConnected, isConnecting, connect, error, clearError } =
    useWalletStore()

  useEffect(() => {
    if (isConnected) {
      router.push('/dashboard')
    }
  }, [isConnected, router])

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="bg-card border border-border rounded-lg p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-lg bg-forge flex items-center justify-center">
              <svg
                aria-hidden="true"
                className="w-7 h-7 text-forge-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="font-display text-lg font-bold text-foreground">
              Connect Wallet
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Choose your ecosystem to access ForgeX
            </p>
          </div>

          {/* Stellar option */}
          <section aria-label="Stellar wallets">
            <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground mb-3">
              STELLAR
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={clearError}
                    aria-label="Dismiss error"
                    className="text-destructive/70 hover:text-destructive shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  >
                    <svg
                      aria-hidden="true"
                      className="w-3.5 h-3.5"
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
              </div>
            )}

            <Button
              onClick={connect}
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <span className="flex items-center gap-2">
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Connecting...
                </span>
              ) : (
                'Connect with Freighter'
              )}
            </Button>

            <div className="mt-4 text-center">
              <a
                href="https://freighter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Don&apos;t have Freighter? Get it here
              </a>
            </div>
          </section>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* EVM option */}
          <section aria-label="EVM wallets">
            <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground mb-3">
              EVM CHAINS
            </p>
            <EvmWalletGate />
          </section>

          {/* Steps */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              How it works
            </p>
            <div className="space-y-3">
              {[
                {
                  step: '1',
                  text: 'Pick Stellar (Freighter) or an EVM wallet',
                },
                {
                  step: '2',
                  text: 'Approve the connection in your wallet',
                },
                {
                  step: '3',
                  text: 'Forge, trade, and explore from your dashboard',
                },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0"
                  >
                    {item.step}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

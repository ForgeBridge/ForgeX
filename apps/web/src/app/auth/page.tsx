'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useWalletStore } from '../../hooks/useWallet'
import { Button } from '../../components/ui/Button'

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
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="bg-card border border-border rounded-lg p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <svg
                className="w-7 h-7 text-primary-foreground"
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
            <h1 className="text-lg font-semibold text-foreground">
              Connect Wallet
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Sign in with your Stellar wallet to access ForgeX
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <div className="flex items-start justify-between gap-2">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={clearError}
                  className="text-destructive/70 hover:text-destructive shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Connect Button */}
          <Button
            onClick={connect}
            disabled={isConnecting}
            className="w-full"
            size="lg"
          >
            {isConnecting ? (
              <span className="flex items-center gap-2">
                <svg
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
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
                  />
                </svg>
                Connect with Freighter
              </span>
            )}
          </Button>

          {/* Steps */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              How it works
            </p>
            <div className="space-y-3">
              {[
                {
                  step: '1',
                  text: 'Install the Freighter browser extension',
                },
                {
                  step: '2',
                  text: 'Create or import a Stellar wallet',
                },
                {
                  step: '3',
                  text: 'Connect and start trading',
                },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
                    {item.step}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Link */}
          <div className="mt-6 text-center">
            <a
              href="https://freighter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Don&apos;t have Freighter? Get it here
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

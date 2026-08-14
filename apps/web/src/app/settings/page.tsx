'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useThemeStore } from '../../hooks/useTheme'
import { useTradeStore } from '../../hooks/useBondingCurve'

const SLIPPAGE_PRESETS = [0.5, 1.0, 2.0, 5.0]
const DEADLINE_OPTIONS = [
  { label: '5 minutes', value: 300 },
  { label: '10 minutes', value: 600 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
]

export default function SettingsPage() {
  const { theme, toggleTheme, initTheme } = useThemeStore()
  const { slippage, setSlippage } = useTradeStore()
  const [mounted, setMounted] = useState(false)
  const [deadline, setDeadline] = useState(3600)
  const [customSlippage, setCustomSlippage] = useState('')
  const [isCustomSlippage, setIsCustomSlippage] = useState(
    !SLIPPAGE_PRESETS.includes(slippage)
  )

  useEffect(() => {
    initTheme()
    setMounted(true)
  }, [initTheme])

  if (!mounted) return null

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your trading preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Theme */}
          <section className="bg-card rounded-lg border border-border p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
              <p className="text-xs text-muted-foreground mt-1">Switch between light and dark mode.</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Theme</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="relative inline-flex h-6 w-11 items-center rounded-full border border-border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-foreground transition-transform ${
                    theme === 'dark' ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Current mode</span>
              <span className="text-foreground font-medium capitalize">{theme}</span>
            </div>
          </section>

          {/* Slippage */}
          <section className="bg-card rounded-lg border border-border p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Slippage Tolerance</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum price movement you&apos;re willing to accept per trade.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {SLIPPAGE_PRESETS.map((preset) => {
                const isSelected = !isCustomSlippage && slippage === preset
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setIsCustomSlippage(false)
                      setCustomSlippage('')
                      setSlippage(preset)
                    }}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {preset}%
                  </button>
                )
              })}

              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="50"
                  placeholder="Custom"
                  value={customSlippage}
                  onChange={(e) => {
                    setIsCustomSlippage(true)
                    setCustomSlippage(e.target.value)
                    const parsed = parseFloat(e.target.value)
                    if (!isNaN(parsed) && parsed >= 0.1 && parsed <= 50) {
                      setSlippage(parsed)
                    }
                  }}
                  onFocus={() => setIsCustomSlippage(true)}
                  className={`w-full h-9 px-3 rounded-md bg-background border text-sm font-mono ${
                    isCustomSlippage
                      ? 'border-primary text-foreground'
                      : 'border-border text-muted-foreground'
                  } placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                  %
                </span>
              </div>
            </div>

            {slippage > 5 && (
              <p className="text-xs text-warning">
                High slippage increases frontrunning risk.
              </p>
            )}
          </section>

          {/* Deadline */}
          <section className="bg-card rounded-lg border border-border p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Transaction Deadline</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum time to wait for a transaction to confirm before it expires.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEADLINE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDeadline(option.value)}
                  className={`px-3 py-2.5 rounded-md text-sm font-medium border transition-colors ${
                    deadline === option.value
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          {/* Network */}
          <section className="bg-card rounded-lg border border-border p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Network</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Select which Stellar network to connect to.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              Use the network selector in the header to switch between Testnet and Mainnet.
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  )
}

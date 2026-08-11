'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { WalletConnect } from '../wallet/WalletConnect'
import { NetworkBadge } from '../wallet/NetworkBadge'
import { ThemeToggle } from '../ui/ThemeToggle'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileMenuOpen])

  return (
    <header className="border-b border-[var(--forgex-border)] bg-[var(--forgex-surface)] relative z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-[var(--forgex-primary)] flex items-center gap-2">
          <span>ForgeX</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-5">
          <Link
            href="/"
            className="text-sm font-medium text-[var(--forgex-text-muted)] hover:text-[var(--forgex-text)] transition-colors"
          >
            Feed
          </Link>
          <Link
            href="/create"
            className="text-sm font-medium text-[var(--forgex-text-muted)] hover:text-[var(--forgex-text)] transition-colors"
          >
            Create
          </Link>
          <NetworkBadge />
          <ThemeToggle />
          <WalletConnect />
        </nav>

        {/* Mobile Nav Trigger, Network & Theme */}
        <div className="flex md:hidden items-center gap-2">
          <NetworkBadge />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
            aria-expanded={mobileMenuOpen}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-[var(--forgex-border)] text-[var(--forgex-text-muted)] hover:text-[var(--forgex-text)] transition-colors"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="md:hidden border-b border-[var(--forgex-border)] bg-[var(--forgex-surface)] px-4 py-6 space-y-4 animate-slideDown shadow-xl"
        >
          <div className="flex flex-col space-y-2">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 min-h-[44px] flex items-center rounded-lg text-base font-semibold text-[var(--forgex-text)] hover:bg-[var(--forgex-bg)] transition-colors"
            >
              Token Feed
            </Link>
            <Link
              href="/create"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 min-h-[44px] flex items-center rounded-lg text-base font-semibold text-[var(--forgex-text)] hover:bg-[var(--forgex-bg)] transition-colors"
            >
              Create Token
            </Link>
          </div>

          <div className="pt-4 border-t border-[var(--forgex-border)]">
            <WalletConnect />
          </div>
        </div>
      )}
    </header>
  )
}

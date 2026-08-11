import type { Metadata } from 'next'
import { WalletConnect } from '../components/wallet/WalletConnect'
import { WalletErrorBanner } from '../components/wallet/WalletErrorBanner'
import { NetworkBadge } from '../components/wallet/NetworkBadge'
import { NetworkMismatchBanner } from '../components/wallet/NetworkMismatchBanner'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'ForgeX — Forge your token on Stellar',
  description: 'Create, trade, and discover tokens on Stellar/Soroban with zero upfront liquidity.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="flex flex-col min-h-screen">
          <header className="border-b border-[var(--forgex-border)] bg-[var(--forgex-surface)]">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
              <a href="/" className="text-xl font-bold text-[var(--forgex-primary)]">
                ForgeX
              </a>
              <nav className="flex items-center gap-4 sm:gap-6">
                <a href="/" className="text-sm text-[var(--forgex-text-muted)] hover:text-[var(--forgex-text)]">
                  Feed
                </a>
                <a href="/create" className="text-sm text-[var(--forgex-text-muted)] hover:text-[var(--forgex-text)]">
                  Create
                </a>
                <NetworkBadge />
                <WalletConnect />
              </nav>
            </div>
          </header>
          <NetworkMismatchBanner />
          <WalletErrorBanner />
          <main className="flex-1">
            {children}
          </main>
          <footer className="border-t border-[var(--forgex-border)] bg-[var(--forgex-surface)] py-8">
            <div className="max-w-7xl mx-auto px-4 text-center text-sm text-[var(--forgex-text-muted)]">
              ForgeX — Open source token launchpad on Stellar/Soroban
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { Header } from '../components/layout/Header'
import { WalletErrorBanner } from '../components/wallet/WalletErrorBanner'
import { NetworkMismatchBanner } from '../components/wallet/NetworkMismatchBanner'
import { ToastContainer } from '../components/ui/Toast'
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
          <Header />
          <NetworkMismatchBanner />
          <WalletErrorBanner />
          <main className="flex-1">
            {children}
          </main>
          <ToastContainer />
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

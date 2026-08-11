import type { Metadata } from 'next'
import { Header } from '../components/layout/Header'
import { WalletErrorBanner } from '../components/wallet/WalletErrorBanner'
import { NetworkMismatchBanner } from '../components/wallet/NetworkMismatchBanner'
import { ToastContainer } from '../components/ui/Toast'
import '../styles/globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://forgex.fi'),
  title: {
    default: 'ForgeX — Launch & Trade Tokens on Stellar',
    template: '%s | ForgeX',
  },
  description: 'Fair launch bonding curve launchpad for tokens on Stellar and Soroban with zero upfront liquidity.',
  keywords: [
    'Stellar',
    'Soroban',
    'ForgeX',
    'Bonding Curve',
    'Token Launchpad',
    'AMM',
    'Crypto',
    'XLM',
    'DeFi',
  ],
  authors: [{ name: 'ForgeX Protocol' }],
  creator: 'ForgeX Protocol',
  openGraph: {
    title: 'ForgeX — Launch & Trade Tokens on Stellar',
    description: 'Fair launch bonding curve launchpad for tokens on Stellar and Soroban.',
    url: 'https://forgex.fi',
    siteName: 'ForgeX',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ForgeX — Launch & Trade Tokens on Stellar',
    description: 'Fair launch bonding curve launchpad for tokens on Stellar and Soroban.',
    creator: '@forgex',
  },
  robots: {
    index: true,
    follow: true,
  },
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

import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ThemeProvider } from '../components/providers/ThemeProvider'
import { Header } from '../components/layout/Header'
import { EnvValidationBanner } from '../components/common/EnvValidationBanner'
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
  description:
    'Zero-liquidity fair launches on Stellar. Launch and trade bonding curve tokens with Soroban smart contracts.',
  keywords: [
    'Stellar',
    'Soroban',
    'ForgeX',
    'Bonding Curve',
    'Token Launchpad',
    'DeFi',
    'XLM',
    'Fair Launch',
  ],
  authors: [{ name: 'ForgeX Protocol' }],
  creator: 'ForgeX Protocol',
  openGraph: {
    title: 'ForgeX — Launch & Trade Tokens on Stellar',
    description: 'Zero-liquidity fair launches on Stellar with bonding curve mechanics.',
    url: 'https://forgex.fi',
    siteName: 'ForgeX',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ForgeX — Launch & Trade Tokens on Stellar',
    description: 'Zero-liquidity fair launches on Stellar with bonding curve mechanics.',
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
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} min-h-screen bg-background text-foreground font-sans`}
      >
        <ThemeProvider>
          <div className="flex flex-col min-h-screen">
            <Header />
            <EnvValidationBanner />
            <NetworkMismatchBanner />
            <WalletErrorBanner />
            <main className="flex-1">{children}</main>
            <ToastContainer />
            <footer className="border-t border-border bg-card py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">ForgeX</span>
                    <span className="text-sm text-muted-foreground">
                      — Open source token launchpad on Stellar/Soroban
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <a
                      href="https://github.com/ForgeBridge/ForgeX"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground transition-colors"
                    >
                      GitHub
                    </a>
                    <a
                      href="https://docs.forgex.fi"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground transition-colors"
                    >
                      Docs
                    </a>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

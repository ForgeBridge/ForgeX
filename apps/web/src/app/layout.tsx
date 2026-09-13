import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Outfit } from 'next/font/google'
import { ThemeProvider } from '../components/providers/ThemeProvider'
import { ReownProvider } from '../components/providers/ReownProvider'
import { PrivyProvider } from '../components/providers/PrivyProvider'
import { Header } from '../components/layout/Header'
import { SiteFooter } from '../components/layout/SiteFooter'
import { EnvValidationBanner } from '../components/common/EnvValidationBanner'
import { WalletErrorBanner } from '../components/wallet/WalletErrorBanner'
import { NetworkMismatchBanner } from '../components/wallet/NetworkMismatchBanner'
import { ToastContainer } from '../components/ui/Toast'
import '../styles/globals.css'

const displayFont = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
}

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
      <head>
        <link rel="preconnect" href="https://ipfs.io" crossOrigin="anonymous" />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} ${displayFont.variable} min-h-screen bg-background text-foreground font-sans`}
      >
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <ThemeProvider>
          <ReownProvider>
          <PrivyProvider>
          <div className="flex flex-col min-h-screen">
            <Header />
            <EnvValidationBanner />
            <NetworkMismatchBanner />
            <WalletErrorBanner />
            <main id="main-content" className="flex-1">{children}</main>
            <ToastContainer />
            <SiteFooter />
          </div>
          </PrivyProvider>
          </ReownProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

'use client'

import { usePathname } from 'next/navigation'

export function SiteFooter() {
  const pathname = usePathname()

  // The homepage is a blank immersive journey with its own minimal chrome.
  if (pathname === '/') return null

  return (
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
  )
}

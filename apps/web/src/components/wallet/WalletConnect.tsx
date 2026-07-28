'use client'

export function WalletConnect() {
  return (
    <button
      className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--forgex-primary)] text-white hover:opacity-90 transition-opacity"
      onClick={() => alert('Freighter wallet connection coming soon')}
    >
      Connect Wallet
    </button>
  )
}

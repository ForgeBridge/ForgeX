'use client'

import { useState } from 'react'
import { TokenAvatar } from './TokenAvatar'
import { truncateAddress } from '../../lib/format'
import { SupportedNetwork } from '../../hooks/useWallet'

export interface TokenDetailMetadata {
  name: string
  symbol: string
  tokenId: string
  curveId?: string
  creator?: string
  createdAt?: number
  description?: string
  imageUri?: string
  website?: string
  twitter?: string
  telegram?: string
}

export interface TokenDetailHeaderProps {
  metadata: TokenDetailMetadata
  network?: SupportedNetwork
  isLive?: boolean
}

export function TokenDetailHeader({
  metadata,
  network = 'testnet',
  isLive = true,
}: TokenDetailHeaderProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      // Clipboard fallback
    }
  }

  const explorerBaseUrl =
    network === 'mainnet'
      ? 'https://stellar.expert/explorer/public'
      : 'https://stellar.expert/explorer/testnet'

  const formattedDate = metadata.createdAt
    ? new Date(metadata.createdAt * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <div className="bg-[var(--forgex-surface)] rounded-xl border border-[var(--forgex-border)] p-6 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <TokenAvatar
            symbol={metadata.symbol}
            imageUri={metadata.imageUri}
            size="lg"
          />
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--forgex-text)]">
                {metadata.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[var(--forgex-primary)]/20 text-[var(--forgex-primary)]">
                ${metadata.symbol}
              </span>
              {isLive && (
                <span
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20"
                  title="Real-time updates active"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live
                </span>
              )}
            </div>
            {formattedDate && (
              <p className="text-xs text-[var(--forgex-text-muted)] mt-1">
                Forged on {formattedDate}
              </p>
            )}
          </div>
        </div>

        {/* External Links */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`${explorerBaseUrl}/contract/${metadata.tokenId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--forgex-bg)] border border-[var(--forgex-border)] hover:border-[var(--forgex-primary)] text-[var(--forgex-text-muted)] hover:text-[var(--forgex-text)] transition-colors"
          >
            <span>Stellar Expert</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          {metadata.website && (
            <a
              href={metadata.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--forgex-bg)] border border-[var(--forgex-border)] hover:border-[var(--forgex-primary)] text-[var(--forgex-text-muted)] hover:text-[var(--forgex-text)] transition-colors"
            >
              <span>Website</span>
            </a>
          )}
        </div>
      </div>

      {metadata.description && (
        <p className="text-sm text-[var(--forgex-text-muted)] leading-relaxed max-w-3xl">
          {metadata.description}
        </p>
      )}

      {/* Contract & Creator Metadata Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-[var(--forgex-border)] text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--forgex-bg)]/60 border border-[var(--forgex-border)]/50">
          <span className="text-[var(--forgex-text-muted)]">Token ID:</span>
          <div className="flex items-center gap-1.5 font-mono">
            <span>{truncateAddress(metadata.tokenId, 6, 6)}</span>
            <button
              type="button"
              onClick={() => handleCopy(metadata.tokenId, 'token')}
              aria-label="Copy token ID"
              className="p-1 text-[var(--forgex-text-muted)] hover:text-[var(--forgex-primary)] transition-colors"
            >
              {copiedKey === 'token' ? '✓' : '📋'}
            </button>
          </div>
        </div>

        {metadata.curveId && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--forgex-bg)]/60 border border-[var(--forgex-border)]/50">
            <span className="text-[var(--forgex-text-muted)]">Curve ID:</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span>{truncateAddress(metadata.curveId, 6, 6)}</span>
              <button
                type="button"
                onClick={() => handleCopy(metadata.curveId!, 'curve')}
                aria-label="Copy curve ID"
                className="p-1 text-[var(--forgex-text-muted)] hover:text-[var(--forgex-primary)] transition-colors"
              >
                {copiedKey === 'curve' ? '✓' : '📋'}
              </button>
            </div>
          </div>
        )}

        {metadata.creator && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--forgex-bg)]/60 border border-[var(--forgex-border)]/50">
            <span className="text-[var(--forgex-text-muted)]">Creator:</span>
            <div className="flex items-center gap-1.5 font-mono">
              <a
                href={`${explorerBaseUrl}/account/${metadata.creator}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--forgex-primary)] hover:underline"
              >
                {truncateAddress(metadata.creator, 6, 6)}
              </a>
              <button
                type="button"
                onClick={() => handleCopy(metadata.creator!, 'creator')}
                aria-label="Copy creator address"
                className="p-1 text-[var(--forgex-text-muted)] hover:text-[var(--forgex-primary)] transition-colors"
              >
                {copiedKey === 'creator' ? '✓' : '📋'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

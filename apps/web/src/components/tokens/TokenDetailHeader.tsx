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
    <div className="bg-card rounded-lg border border-border p-5 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <TokenAvatar
            symbol={metadata.symbol}
            imageUri={metadata.imageUri}
            size="lg"
          />
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {metadata.name}
              </h1>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                ${metadata.symbol}
              </span>
              {isLive && (
                <span
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-success/10 text-success font-medium border border-success/20"
                  title="Real-time updates"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-subtle" />
                  Live
                </span>
              )}
            </div>
            {formattedDate && (
              <p className="text-xs text-muted-foreground mt-1">
                Forged on {formattedDate}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`${explorerBaseUrl}/contract/${metadata.tokenId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-muted border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Stellar Expert</span>
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </a>
          {metadata.website && (
            <a
              href={metadata.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-muted border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground transition-colors"
            >
              Website
            </a>
          )}
        </div>
      </div>

      {metadata.description && (
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
          {metadata.description}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-3 border-t border-border text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-md bg-muted border border-border/50">
          <span className="text-muted-foreground">Token ID:</span>
          <div className="flex items-center gap-1.5 font-mono">
            <span>{truncateAddress(metadata.tokenId, 6, 6)}</span>
            <button
              type="button"
              onClick={() => handleCopy(metadata.tokenId, 'token')}
              aria-label="Copy token ID"
              className="p-0.5 text-muted-foreground hover:text-primary transition-colors rounded"
            >
              {copiedKey === 'token' ? (
                <span className="text-success text-[11px]">✓</span>
              ) : (
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {metadata.curveId && (
          <div className="flex items-center justify-between p-2.5 rounded-md bg-muted border border-border/50">
            <span className="text-muted-foreground">Curve ID:</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span>{truncateAddress(metadata.curveId, 6, 6)}</span>
              <button
                type="button"
                onClick={() => handleCopy(metadata.curveId!, 'curve')}
                aria-label="Copy curve ID"
                className="p-0.5 text-muted-foreground hover:text-primary transition-colors rounded"
              >
                {copiedKey === 'curve' ? (
                  <span className="text-success text-[11px]">✓</span>
                ) : (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        {metadata.creator && (
          <div className="flex items-center justify-between p-2.5 rounded-md bg-muted border border-border/50">
            <span className="text-muted-foreground">Creator:</span>
            <div className="flex items-center gap-1.5 font-mono">
              <a
                href={`${explorerBaseUrl}/account/${metadata.creator}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary hover:underline"
              >
                {truncateAddress(metadata.creator, 6, 6)}
              </a>
              <button
                type="button"
                onClick={() => handleCopy(metadata.creator!, 'creator')}
                aria-label="Copy creator address"
                className="p-0.5 text-muted-foreground hover:text-primary transition-colors rounded"
              >
                {copiedKey === 'creator' ? (
                  <span className="text-success text-[11px]">✓</span>
                ) : (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { resolveMediaUrl, getDeterministicGradient } from '../../lib/ipfs'

export interface TokenAvatarProps {
  symbol: string
  imageUri?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  alt?: string
}

export function TokenAvatar({
  symbol,
  imageUri,
  size = 'md',
  className = '',
  alt,
}: TokenAvatarProps) {
  const [imageError, setImageError] = useState(false)
  const resolvedUrl = resolveMediaUrl(imageUri)

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base font-bold',
    xl: 'w-20 h-20 text-xl font-bold',
  }

  const initials = (symbol || '?').slice(0, 3).toUpperCase()
  const gradient = getDeterministicGradient(symbol || 'DEFAULT')

  if (resolvedUrl && !imageError) {
    return (
      <div
        className={`relative overflow-hidden rounded-full shrink-0 border border-[var(--forgex-border)] bg-[var(--forgex-surface)] ${sizeClasses[size]} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedUrl}
          alt={alt || `${symbol} token icon`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      </div>
    )
  }

  return (
    <div
      role="img"
      aria-label={alt || `${symbol} avatar`}
      className={`rounded-full shrink-0 flex items-center justify-center font-bold text-white bg-gradient-to-br shadow-inner ${gradient} ${sizeClasses[size]} ${className}`}
    >
      {initials}
    </div>
  )
}

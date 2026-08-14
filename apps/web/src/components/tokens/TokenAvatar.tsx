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
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base',
  }

  const initials = (symbol || '?').slice(0, 2).toUpperCase()
  const gradient = getDeterministicGradient(symbol || 'DEFAULT')

  if (resolvedUrl && !imageError) {
    return (
      <div
        className={`relative overflow-hidden rounded-md shrink-0 border border-border bg-muted ${sizeClasses[size]} ${className}`}
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
      className={`rounded-md shrink-0 flex items-center justify-center font-bold text-white bg-gradient-to-br ${gradient} ${sizeClasses[size]} ${className}`}
    >
      {initials}
    </div>
  )
}

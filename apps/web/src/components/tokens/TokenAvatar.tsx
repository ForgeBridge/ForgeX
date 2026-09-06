'use client'

import { useState } from 'react'
import Image from 'next/image'
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

  const sizePx = { sm: 28, md: 36, lg: 48, xl: 64 } as const

  const initials = (symbol || '?').slice(0, 2).toUpperCase()
  const gradient = getDeterministicGradient(symbol || 'DEFAULT')

  if (resolvedUrl && !imageError) {
    return (
      <div
        className={`relative overflow-hidden rounded-md shrink-0 border border-border bg-muted ${sizeClasses[size]} ${className}`}
        style={{ width: sizePx[size], height: sizePx[size] }}
      >
        <Image
          src={resolvedUrl}
          alt={alt || `${symbol} token icon`}
          width={sizePx[size]}
          height={sizePx[size]}
          sizes={`${sizePx[size]}px`}
          loading="lazy"
          decoding="async"
          unoptimized
          className="w-full h-full object-cover"
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

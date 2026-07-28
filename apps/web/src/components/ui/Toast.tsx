'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
  onClose: () => void
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!visible) return null

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-[var(--forgex-primary)]',
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg text-white text-sm ${colors[type]}`}>
      {message}
    </div>
  )
}

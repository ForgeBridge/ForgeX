'use client'

import { useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { useThemeStore } from '../../hooks/useTheme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { initTheme } = useThemeStore()

  useEffect(() => {
    initTheme()
  }, [initTheme])

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}

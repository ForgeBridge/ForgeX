'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

export interface UsePollingOptions {
  intervalMs?: number
  enabled?: boolean
  pauseOnHidden?: boolean
  immediate?: boolean
}

export interface UsePollingResult {
  refresh: () => Promise<void>
  isPolling: boolean
  lastRefreshedAt: number | null
}

export function usePolling(
  callback: () => Promise<void> | void,
  options: UsePollingOptions = {}
): UsePollingResult {
  const {
    intervalMs = 5000,
    enabled = true,
    pauseOnHidden = true,
    immediate = true,
  } = options

  const savedCallback = useRef(callback)
  const [isPolling, setIsPolling] = useState(enabled)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  const executeCallback = useCallback(async () => {
    try {
      await savedCallback.current()
      setLastRefreshedAt(Date.now())
    } catch {
      // Errors handled within the provided callback
    }
  }, [])

  useEffect(() => {
    if (!enabled || intervalMs <= 0) {
      setIsPolling(false)
      return
    }

    setIsPolling(true)

    if (immediate) {
      executeCallback()
    }

    let intervalId: NodeJS.Timeout | null = null

    const startInterval = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (pauseOnHidden && typeof document !== 'undefined' && document.hidden) {
            return
          }
          executeCallback()
        }, intervalMs)
      }
    }

    const stopInterval = () => {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return
      if (document.hidden) {
        if (pauseOnHidden) {
          stopInterval()
        }
      } else {
        if (pauseOnHidden) {
          executeCallback()
          startInterval()
        }
      }
    }

    startInterval()

    if (pauseOnHidden && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      stopInterval()
      if (pauseOnHidden && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
      setIsPolling(false)
    }
  }, [enabled, intervalMs, pauseOnHidden, immediate, executeCallback])

  return {
    refresh: executeCallback,
    isPolling,
    lastRefreshedAt,
  }
}

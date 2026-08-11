import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePolling } from './usePolling'

describe('usePolling Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('triggers callback immediately upon mount when immediate is true', () => {
    const callback = vi.fn()
    renderHook(() => usePolling(callback, { intervalMs: 1000, immediate: true }))

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('does not trigger immediately when immediate is false', () => {
    const callback = vi.fn()
    renderHook(() => usePolling(callback, { intervalMs: 1000, immediate: false }))

    expect(callback).not.toHaveBeenCalled()
  })

  it('triggers callback periodically according to intervalMs', () => {
    const callback = vi.fn()
    renderHook(() => usePolling(callback, { intervalMs: 1000, immediate: false }))

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(callback).toHaveBeenCalledTimes(3)
  })

  it('allows manual refresh invocation', async () => {
    const callback = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => usePolling(callback, { intervalMs: 5000, immediate: false }))

    expect(callback).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.refresh()
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(result.current.lastRefreshedAt).not.toBeNull()
  })

  it('pauses polling when document is hidden and resumes when visible', () => {
    let isHidden = false
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => isHidden,
    })

    const callback = vi.fn()
    renderHook(() => usePolling(callback, { intervalMs: 1000, pauseOnHidden: true, immediate: false }))

    // Document becomes hidden
    isHidden = true
    document.dispatchEvent(new Event('visibilitychange'))

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    // Interval was stopped
    expect(callback).not.toHaveBeenCalled()

    // Document becomes visible again
    isHidden = false
    document.dispatchEvent(new Event('visibilitychange'))

    expect(callback).toHaveBeenCalledTimes(1) // Immediate refresh on visibility restore

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback).toHaveBeenCalledTimes(2)
  })
})

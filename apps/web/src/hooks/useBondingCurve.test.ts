import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTradeStore, useBondingCurve } from './useBondingCurve'

describe('useBondingCurve & Trade Store Reactive Refresh', () => {
  beforeEach(() => {
    useTradeStore.setState({
      buyAmount: '',
      sellAmount: '',
      slippage: 1,
      estimatedCost: '0',
      estimatedPayout: '0',
      refreshCounter: 0,
    })
  })

  it('increments refresh counter when triggerRefresh is called', () => {
    expect(useTradeStore.getState().refreshCounter).toBe(0)
    act(() => {
      useTradeStore.getState().triggerRefresh()
    })
    expect(useTradeStore.getState().refreshCounter).toBe(1)
  })

  it('initializes useBondingCurve with default curve stats', () => {
    const { result } = renderHook(() => useBondingCurve('CCURVE_123'))
    expect(result.current.data.price).toBe('0.0001')
    expect(result.current.data.reserveBalance).toBe('5000')
    expect(result.current.refreshCounter).toBe(0)
  })

  it('re-fetches curve data when refresh counter changes', async () => {
    const { result } = renderHook(() => useBondingCurve('CCURVE_123'))

    act(() => {
      result.current.triggerRefresh()
    })

    expect(result.current.refreshCounter).toBe(1)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { useTxStore } from './useTxState'

describe('useTxStore Zustand store', () => {
  beforeEach(() => {
    useTxStore.getState().reset()
    useTxStore.getState().clearHistory()
  })

  it('initializes with idle status and empty tx', () => {
    const state = useTxStore.getState()
    expect(state.status).toBe('idle')
    expect(state.currentTx).toBeNull()
    expect(state.history).toHaveLength(0)
  })

  it('transitions through full transaction lifecycle', () => {
    // 1. Start Tx
    useTxStore.getState().startTx({
      type: 'buy',
      amount: '500',
      tokenSymbol: 'FORGE',
    })
    expect(useTxStore.getState().status).toBe('preparing')
    expect(useTxStore.getState().currentTx?.amount).toBe('500')

    // 2. Signing
    useTxStore.getState().setSigning()
    expect(useTxStore.getState().status).toBe('signing')

    // 3. Submitting
    useTxStore.getState().setSubmitting()
    expect(useTxStore.getState().status).toBe('submitting')

    // 4. Pending
    useTxStore.getState().setPending('hash_12345')
    expect(useTxStore.getState().status).toBe('pending')
    expect(useTxStore.getState().currentTx?.txHash).toBe('hash_12345')

    // 5. Success
    useTxStore.getState().setSuccess('hash_12345')
    expect(useTxStore.getState().status).toBe('success')
    expect(useTxStore.getState().history).toHaveLength(1)
    expect(useTxStore.getState().history[0].txHash).toBe('hash_12345')

    // 6. Reset
    useTxStore.getState().reset()
    expect(useTxStore.getState().status).toBe('idle')
    expect(useTxStore.getState().currentTx).toBeNull()
    expect(useTxStore.getState().history).toHaveLength(1)
  })

  it('records failed transaction in history with error message', () => {
    useTxStore.getState().startTx({
      type: 'sell',
      amount: '200',
      tokenSymbol: 'TEST',
    })
    useTxStore.getState().setError('User rejected signing')

    expect(useTxStore.getState().status).toBe('error')
    expect(useTxStore.getState().currentTx?.errorMessage).toBe('User rejected signing')
    expect(useTxStore.getState().history).toHaveLength(1)
    expect(useTxStore.getState().history[0].errorMessage).toBe('User rejected signing')
  })
})

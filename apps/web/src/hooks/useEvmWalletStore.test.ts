import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useChainStore, useEvmWalletStore } from './useEvmWalletStore'

vi.mock('../lib/arc', () => ({
  DEFAULT_CHAIN: 'stellar',
  getArcConfig: () => ({ enabled: true, chainId: 5042002 }),
}))

describe('useChainStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useChainStore.setState({ activeChain: 'stellar', availableChains: ['stellar', 'arc'] })
  })

  it('starts on Stellar even when Arc is configured', () => {
    expect(useChainStore.getState().activeChain).toBe('stellar')
  })

  it('offers both chains when Arc is configured', () => {
    expect(useChainStore.getState().availableChains).toEqual(['stellar', 'arc'])
  })

  it('switches to Arc', () => {
    useChainStore.getState().setActiveChain('arc')
    expect(useChainStore.getState().activeChain).toBe('arc')
  })

  it('ignores a switch to a chain that is not available', () => {
    useChainStore.setState({ availableChains: ['stellar'] })
    useChainStore.getState().setActiveChain('arc')
    expect(useChainStore.getState().activeChain).toBe('stellar')
  })
})

describe('useEvmWalletStore', () => {
  beforeEach(() => {
    useEvmWalletStore.getState().disconnect()
  })

  it('starts disconnected with no transport', () => {
    const state = useEvmWalletStore.getState()
    expect(state.address).toBeNull()
    expect(state.isConnected).toBe(false)
    expect(state.transport).toBeNull()
    expect(state.isWrongNetwork).toBe(false)
  })

  it('records a snapshot from the wallet bridge', () => {
    useEvmWalletStore.getState().setSnapshot({
      address: '0x1111111111111111111111111111111111111111',
      chainId: 5042002,
      isConnected: true,
    })

    const state = useEvmWalletStore.getState()
    expect(state.address).toBe('0x1111111111111111111111111111111111111111')
    expect(state.isConnected).toBe(true)
    expect(state.isConnecting).toBe(false)
  })

  it('clears everything on disconnect, including any stale error', () => {
    useEvmWalletStore.getState().setError('boom')
    useEvmWalletStore.getState().setSnapshot({ address: '0x2222222222222222222222222222222222222222', isConnected: true })

    useEvmWalletStore.getState().disconnect()

    const state = useEvmWalletStore.getState()
    expect(state.address).toBeNull()
    expect(state.isConnected).toBe(false)
    expect(state.error).toBeNull()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useWalletStore } from './useWallet'

// Mock the Privy modules
vi.mock('@privy-io/react-auth', () => ({
  usePrivy: vi.fn(() => ({
    ready: true,
    authenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  })),
  useWallets: vi.fn(() => ({ wallets: [], ready: true })),
}))

vi.mock('@privy-io/react-auth/extended-chains', () => ({
  useCreateWallet: vi.fn(() => ({
    createWallet: vi.fn(),
  })),
  useSignRawHash: vi.fn(() => ({
    signRawHash: vi.fn(),
  })),
}))

vi.mock('../components/providers/PrivyProvider', () => ({
  isPrivyConfigured: vi.fn(() => false),
}))

describe('useWalletStore', () => {
  beforeEach(() => {
    useWalletStore.setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      networkPassphrase: null,
      balance: null,
      signTransaction: null,
    })
    vi.clearAllMocks()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { sequence: '1' } }),
    } as any)
  })

  it('should have correct initial state', () => {
    const state = useWalletStore.getState()
    expect(state.address).toBeNull()
    expect(state.isConnected).toBe(false)
    expect(state.isConnecting).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should disconnect correctly', () => {
    useWalletStore.setState({
      address: 'GTEST',
      isConnected: true,
    })

    act(() => {
      useWalletStore.getState().disconnect()
    })

    const state = useWalletStore.getState()
    expect(state.address).toBeNull()
    expect(state.isConnected).toBe(false)
  })

  it('should clear error', () => {
    useWalletStore.setState({ error: 'Some error' })

    act(() => {
      useWalletStore.getState().clearError()
    })

    expect(useWalletStore.getState().error).toBeNull()
  })

  it('should set balance and track update time', () => {
    act(() => {
      useWalletStore.getState().setBalance('50.00')
    })

    const state = useWalletStore.getState()
    expect(state.balance).toBe('50.00')
    expect(state.lastBalanceUpdate).toBeTypeOf('number')
  })

  it('should update network and detect mismatches', () => {
    useWalletStore.setState({
      isConnected: true,
      networkPassphrase: 'Test SDF Network ; September 2015',
    })

    act(() => {
      useWalletStore.getState().setNetwork('mainnet')
    })

    expect(useWalletStore.getState().isNetworkMismatch).toBe(true)

    act(() => {
      useWalletStore.getState().setNetwork('testnet')
    })

    expect(useWalletStore.getState().isNetworkMismatch).toBe(false)
  })

  it('should clear balance when disconnecting', () => {
    useWalletStore.setState({
      address: 'GTEST',
      isConnected: true,
      balance: '100.00',
    })

    act(() => {
      useWalletStore.getState().disconnect()
    })

    expect(useWalletStore.getState().balance).toBeNull()
  })
})

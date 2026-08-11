import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useWalletStore } from './useWallet'

// Mock the freighter-api module
vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(),
  isAllowed: vi.fn(),
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
  getNetworkDetails: vi.fn(),
}))

describe('useWalletStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useWalletStore.setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      networkPassphrase: null,
    })
    vi.clearAllMocks()
  })

  it('should have correct initial state', () => {
    const state = useWalletStore.getState()
    expect(state.address).toBeNull()
    expect(state.isConnected).toBe(false)
    expect(state.isConnecting).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should connect successfully with Freighter', async () => {
    const freighter = await import('@stellar/freighter-api')
    vi.mocked(freighter.isConnected).mockResolvedValue({
      isConnected: true,
    } as ReturnType<typeof freighter.isConnected> extends Promise<infer R> ? R : never)
    vi.mocked(freighter.isAllowed).mockResolvedValue({
      isAllowed: true,
    } as ReturnType<typeof freighter.isAllowed> extends Promise<infer R> ? R : never)
    vi.mocked(freighter.getAddress).mockResolvedValue({
      address: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRST',
    } as ReturnType<typeof freighter.getAddress> extends Promise<infer R> ? R : never)
    vi.mocked(freighter.getNetworkDetails).mockResolvedValue({
      networkPassphrase: 'Test SDF Network ; September 2015',
    } as ReturnType<typeof freighter.getNetworkDetails> extends Promise<infer R> ? R : never)

    await act(async () => {
      await useWalletStore.getState().connect()
    })

    const state = useWalletStore.getState()
    expect(state.isConnected).toBe(true)
    expect(state.address).toBe('GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRST')
    expect(state.isConnecting).toBe(false)
    expect(state.error).toBeNull()
    expect(state.networkPassphrase).toBe('Test SDF Network ; September 2015')
  })

  it('should show error when Freighter is not installed', async () => {
    const freighter = await import('@stellar/freighter-api')
    vi.mocked(freighter.isConnected).mockResolvedValue({
      isConnected: false,
    } as ReturnType<typeof freighter.isConnected> extends Promise<infer R> ? R : never)

    await act(async () => {
      await useWalletStore.getState().connect()
    })

    const state = useWalletStore.getState()
    expect(state.isConnected).toBe(false)
    expect(state.error).toContain('not found')
  })

  it('should handle user rejection', async () => {
    const freighter = await import('@stellar/freighter-api')
    vi.mocked(freighter.isConnected).mockResolvedValue({
      isConnected: true,
    } as ReturnType<typeof freighter.isConnected> extends Promise<infer R> ? R : never)
    vi.mocked(freighter.isAllowed).mockResolvedValue({
      isAllowed: false,
    } as ReturnType<typeof freighter.isAllowed> extends Promise<infer R> ? R : never)
    vi.mocked(freighter.requestAccess).mockRejectedValue(new Error('User rejected'))

    await act(async () => {
      await useWalletStore.getState().connect()
    })

    const state = useWalletStore.getState()
    expect(state.isConnected).toBe(false)
    expect(state.error).toContain('rejected')
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

  it('should prevent concurrent connection attempts', async () => {
    const freighter = await import('@stellar/freighter-api')
    let resolveConnect: () => void
    const connectionPromise = new Promise<void>((resolve) => {
      resolveConnect = resolve
    })

    vi.mocked(freighter.isConnected).mockImplementation(async () => {
      await connectionPromise
      return { isConnected: true } as ReturnType<typeof freighter.isConnected> extends Promise<infer R> ? R : never
    })

    // Set isConnecting to true to simulate an in-progress connection
    useWalletStore.setState({ isConnecting: true })

    // Second call should be a no-op
    await act(async () => {
      await useWalletStore.getState().connect()
    })

    // isConnected should not have called anything
    expect(freighter.isConnected).not.toHaveBeenCalled()

    resolveConnect!()
  })

  it('should detect network mismatch on connection and manual check', async () => {
    const freighter = await import('@stellar/freighter-api')
    vi.mocked(freighter.isConnected).mockResolvedValue({ isConnected: true } as any)
    vi.mocked(freighter.isAllowed).mockResolvedValue({ isAllowed: true } as any)
    vi.mocked(freighter.getAddress).mockResolvedValue({ address: 'GTEST' } as any)
    // Freighter returns Public network passphrase while app is configured for testnet
    vi.mocked(freighter.getNetworkDetails).mockResolvedValue({
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
    } as any)

    useWalletStore.setState({ network: 'testnet' })

    await act(async () => {
      await useWalletStore.getState().connect()
    })

    const state = useWalletStore.getState()
    expect(state.isConnected).toBe(true)
    expect(state.isNetworkMismatch).toBe(true)

    // When user switches app to mainnet, mismatch resolves
    act(() => {
      useWalletStore.getState().setNetwork('mainnet')
    })
    expect(useWalletStore.getState().isNetworkMismatch).toBe(false)
  })
})

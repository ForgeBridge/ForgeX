import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AuthPage from './page'
import { useWalletStore } from '../../hooks/useWallet'

const mockPush = vi.fn()
const mockOpen = vi.fn()
const mockDisconnect = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('../../lib/reown', () => ({
  isReownConfigured: true,
}))

vi.mock('@reown/appkit/react', () => ({
  useAppKit: () => ({ open: mockOpen }),
  useAppKitAccount: () => ({
    address: undefined,
    isConnected: false,
  }),
  useAppKitNetwork: () => ({ caipNetwork: undefined }),
  useDisconnect: () => ({ disconnect: mockDisconnect }),
}))

function resetStores() {
  useWalletStore.setState({
    address: null,
    balance: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  })
}

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStores()
  })

  it('renders Stellar and EVM wallet options', () => {
    render(<AuthPage />)

    expect(
      screen.getByRole('heading', { name: 'Connect Wallet' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Connect with Freighter' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Connect EVM wallet' })
    ).toBeInTheDocument()
  })

  it('opens the AppKit modal for EVM wallets', () => {
    render(<AuthPage />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Connect EVM wallet' })
    )

    expect(mockOpen).toHaveBeenCalledTimes(1)
  })

  it('shows Stellar errors with a dismiss action', () => {
    useWalletStore.setState({ error: 'Connection request was rejected' })
    render(<AuthPage />)

    expect(screen.getByText('Connection request was rejected')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }))

    expect(useWalletStore.getState().error).toBeNull()
  })

  it('redirects to dashboard when Stellar connects', () => {
    const { rerender } = render(<AuthPage />)
    expect(mockPush).not.toHaveBeenCalled()

    useWalletStore.setState({ isConnected: true, address: 'GABC' })
    rerender(<AuthPage />)

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('shows connecting state on the Freighter button', () => {
    useWalletStore.setState({ isConnecting: true })
    render(<AuthPage />)

    expect(
      screen.getByRole('button', { name: 'Connecting...' })
    ).toBeDisabled()
  })
})

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AuthPage from './page'
import { useWalletStore } from '../../hooks/useWallet'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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

  it('renders connect wallet option', () => {
    render(<AuthPage />)

    expect(
      screen.getByRole('heading', { name: 'Connect Wallet' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Connect with Freighter' })
    ).toBeInTheDocument()
  })

  it('shows Stellar errors with a dismiss action', () => {
    useWalletStore.setState({ error: 'Connection request was rejected' })
    render(<AuthPage />)

    expect(screen.getByText('Connection request was rejected')).toBeInTheDocument()
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

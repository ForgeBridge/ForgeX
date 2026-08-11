import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { NetworkMismatchBanner } from './NetworkMismatchBanner'
import { useWalletStore } from '../../hooks/useWallet'

describe('NetworkMismatchBanner', () => {
  beforeEach(() => {
    useWalletStore.setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      network: 'testnet',
      networkPassphrase: null,
      isNetworkMismatch: false,
    })
  })

  it('renders nothing when wallet is disconnected or on correct network', () => {
    const { container } = render(<NetworkMismatchBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders warning alert when wallet is connected on mismatched network', () => {
    useWalletStore.setState({
      isConnected: true,
      isNetworkMismatch: true,
      network: 'testnet',
    })

    render(<NetworkMismatchBanner />)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(screen.getByText(/Network Mismatch:/i)).toBeInTheDocument()
    expect(screen.getByText(/Stellar Testnet/i)).toBeInTheDocument()
  })
})

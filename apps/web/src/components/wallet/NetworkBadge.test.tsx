import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { NetworkBadge } from './NetworkBadge'
import { useWalletStore } from '../../hooks/useWallet'

describe('NetworkBadge', () => {
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

  it('renders network dropdown showing current testnet network', () => {
    render(<NetworkBadge />)
    const select = screen.getByLabelText('Select Network') as HTMLSelectElement
    expect(select).toBeInTheDocument()
    expect(select.value).toBe('testnet')
  })

  it('updates selected network on user interaction', () => {
    render(<NetworkBadge />)
    const select = screen.getByLabelText('Select Network') as HTMLSelectElement

    fireEvent.change(select, { target: { value: 'mainnet' } })
    expect(useWalletStore.getState().network).toBe('mainnet')
  })

  it('displays mismatch tag when wallet is connected on mismatched network', () => {
    useWalletStore.setState({
      isConnected: true,
      isNetworkMismatch: true,
      network: 'testnet',
    })

    render(<NetworkBadge />)
    expect(screen.getByText('Mismatch')).toBeInTheDocument()
  })
})

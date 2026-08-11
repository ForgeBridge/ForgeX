import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WalletConnect } from './WalletConnect'
import { useWalletStore } from '../../hooks/useWallet'

describe('WalletConnect Component', () => {
  beforeEach(() => {
    useWalletStore.setState({
      address: null,
      balance: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    })
  })

  it('renders Connect Wallet button when disconnected', () => {
    render(<WalletConnect />)
    expect(screen.getByRole('button', { name: 'Connect Wallet' })).toBeInTheDocument()
  })

  it('renders wallet address and XLM balance when connected', () => {
    useWalletStore.setState({
      address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      balance: '250.75',
      isConnected: true,
    })

    render(<WalletConnect />)

    expect(screen.getByLabelText('Wallet balance')).toHaveTextContent('250.75 XLM')
    expect(screen.getByText('GAAA...AWHF')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument()
  })

  it('renders placeholder when balance is null/loading', () => {
    useWalletStore.setState({
      address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      balance: null,
      isConnected: true,
    })

    render(<WalletConnect />)
    expect(screen.getByLabelText('Wallet balance')).toHaveTextContent('...')
  })

  it('triggers disconnect when Disconnect button is clicked', () => {
    const disconnectMock = vi.fn()
    useWalletStore.setState({
      address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      balance: '100.00',
      isConnected: true,
      disconnect: disconnectMock,
    })

    render(<WalletConnect />)

    const disconnectBtn = screen.getByRole('button', { name: 'Disconnect' })
    fireEvent.click(disconnectBtn)
    expect(disconnectMock).toHaveBeenCalledTimes(1)
  })
})

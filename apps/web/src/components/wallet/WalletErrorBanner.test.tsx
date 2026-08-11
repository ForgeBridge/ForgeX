import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { WalletErrorBanner } from './WalletErrorBanner'
import { useWalletStore } from '../../hooks/useWallet'

describe('WalletErrorBanner', () => {
  beforeEach(() => {
    useWalletStore.setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    })
  })

  it('renders nothing when there is no error in the wallet store', () => {
    const { container } = render(<WalletErrorBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders error alert when error exists in wallet store', () => {
    useWalletStore.setState({ error: 'Connection request was rejected by user' })
    render(<WalletErrorBanner />)

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(screen.getByText('Connection request was rejected by user')).toBeInTheDocument()
  })

  it('clears error when dismiss button is clicked', () => {
    useWalletStore.setState({ error: 'Freighter extension not found' })
    render(<WalletErrorBanner />)

    const dismissBtn = screen.getByRole('button', { name: /dismiss wallet error/i })
    fireEvent.click(dismissBtn)

    expect(useWalletStore.getState().error).toBeNull()
  })
})

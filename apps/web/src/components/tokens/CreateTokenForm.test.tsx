import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CreateTokenForm } from './CreateTokenForm'
import { useWalletStore } from '../../hooks/useWallet'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('@stellar/freighter-api', () => ({
  signTransaction: vi.fn().mockResolvedValue({ signedTxXdr: 'AAAA...' }),
}))

describe('CreateTokenForm', () => {
  beforeEach(() => {
    useWalletStore.setState({
      address: 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      isConnected: true,
      isConnecting: false,
      error: null,
    })
  })

  it('renders input fields for token details', () => {
    render(<CreateTokenForm />)
    expect(screen.getByLabelText(/Token Name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Token Symbol/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Max Supply/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create Token/i })).toBeInTheDocument()
  })

  it('shows connect wallet button when wallet is disconnected', () => {
    useWalletStore.setState({ isConnected: false, address: null })
    render(<CreateTokenForm />)
    expect(screen.getByRole('button', { name: /Connect Wallet to Create Token/i })).toBeInTheDocument()
  })

  it('submits form and triggers success callback when valid', async () => {
    const onSuccess = vi.fn()
    render(<CreateTokenForm onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText(/Token Name/i), { target: { value: 'Forge Coin' } })
    fireEvent.change(screen.getByLabelText(/Token Symbol/i), { target: { value: 'FORGE' } })

    const submitBtn = screen.getByRole('button', { name: /Create Token/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/Token Created Successfully!/i)).toBeInTheDocument()
    })
    expect(onSuccess).toHaveBeenCalled()
  })
})

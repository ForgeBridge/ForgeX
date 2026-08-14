import { render, screen, fireEvent } from '@testing-library/react'
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

vi.mock('../../hooks/useSoroban', () => ({
  useSoroban: () => ({
    createToken: vi.fn().mockResolvedValue({
      tokenId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
      curveId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
    }),
  }),
}))

describe('CreateTokenForm Validation', () => {
  beforeEach(() => {
    useWalletStore.setState({
      address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      isConnected: true,
      isConnecting: false,
      error: null,
    })
  })

  it('renders Connect Wallet button when wallet is disconnected', () => {
    const connectMock = vi.fn()
    useWalletStore.setState({ isConnected: false, address: null, connect: connectMock })

    render(<CreateTokenForm />)
    const connectBtn = screen.getByRole('button', { name: /Connect Wallet/i })
    expect(connectBtn).toBeInTheDocument()

    fireEvent.click(connectBtn)
    expect(connectMock).toHaveBeenCalledTimes(1)
  })

  it('validates symbol to be alphanumeric only', () => {
    render(<CreateTokenForm />)

    const symbolInput = screen.getByLabelText(/Token Symbol/i)
    fireEvent.change(symbolInput, { target: { value: 'BAD$SYM!' } })
    fireEvent.blur(symbolInput)

    expect(screen.getByText(/1-12 alphanumeric/i)).toBeInTheDocument()
  })

  it('validates max supply on step 2', () => {
    render(<CreateTokenForm />)

    // Fill step 1 to enable Continue
    fireEvent.change(screen.getByLabelText(/Token Name/i), { target: { value: 'Test' } })
    fireEvent.change(screen.getByLabelText(/Token Symbol/i), { target: { value: 'TEST' } })

    // Go to step 2
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    const supplyInput = screen.getByLabelText(/Max Supply/i)
    fireEvent.change(supplyInput, { target: { value: '0' } })
    fireEvent.blur(supplyInput)

    expect(screen.getByText(/Must be > 0/i)).toBeInTheDocument()
  })

  it('validates decimals on step 2', () => {
    render(<CreateTokenForm />)

    fireEvent.change(screen.getByLabelText(/Token Name/i), { target: { value: 'Test' } })
    fireEvent.change(screen.getByLabelText(/Token Symbol/i), { target: { value: 'TEST' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    const decimalsInput = screen.getByLabelText(/Decimals/i)
    fireEvent.change(decimalsInput, { target: { value: '25' } })
    fireEvent.blur(decimalsInput)

    expect(screen.getByText(/0-18/i)).toBeInTheDocument()
  })
})

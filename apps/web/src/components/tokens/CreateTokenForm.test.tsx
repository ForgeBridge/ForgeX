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

describe('CreateTokenForm Validation', () => {
  beforeEach(() => {
    useWalletStore.setState({
      address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      isConnected: true,
      isConnecting: false,
      error: null,
    })
  })

  it('renders required input fields and submit button is initially disabled for empty required fields', () => {
    render(<CreateTokenForm />)
    const submitBtn = screen.getByRole('button', { name: /Create Token/i })
    expect(submitBtn).toBeDisabled()
  })

  it('validates symbol to be alphanumeric only', async () => {
    render(<CreateTokenForm />)

    const symbolInput = screen.getByLabelText(/Token Symbol/i)
    fireEvent.change(symbolInput, { target: { value: 'BAD$SYM!' } })
    fireEvent.blur(symbolInput)

    expect(screen.getByText(/Symbol must contain only alphanumeric characters/i)).toBeInTheDocument()
  })

  it('validates decimals to be between 0 and 18', async () => {
    render(<CreateTokenForm />)

    const decimalsInput = screen.getByLabelText(/Decimals/i)
    fireEvent.change(decimalsInput, { target: { value: '25' } })
    fireEvent.blur(decimalsInput)

    expect(screen.getByText(/Decimals must be an integer between 0 and 18/i)).toBeInTheDocument()
  })

  it('validates max supply to be greater than 0', async () => {
    render(<CreateTokenForm />)

    const supplyInput = screen.getByLabelText(/Max Supply/i)
    fireEvent.change(supplyInput, { target: { value: '0' } })
    fireEvent.blur(supplyInput)

    expect(screen.getByText(/Max supply must be greater than 0/i)).toBeInTheDocument()
  })

  it('validates image URI format', async () => {
    render(<CreateTokenForm />)

    const imageInput = screen.getByLabelText(/Image \/ Icon URL/i)
    fireEvent.change(imageInput, { target: { value: 'ftp://invalid-url.com/img.png' } })
    fireEvent.blur(imageInput)

    expect(screen.getByText(/Image URI must start with https:\/\/ or ipfs:\/\//i)).toBeInTheDocument()
  })

  it('enables submit button and creates token when all fields are valid', async () => {
    const onSuccess = vi.fn()
    render(<CreateTokenForm onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText(/Token Name/i), { target: { value: 'Forge Coin' } })
    fireEvent.change(screen.getByLabelText(/Token Symbol/i), { target: { value: 'FORGE' } })
    fireEvent.change(screen.getByLabelText(/Max Supply/i), { target: { value: '1000000000' } })
    fireEvent.change(screen.getByLabelText(/Decimals/i), { target: { value: '7' } })

    const submitBtn = screen.getByRole('button', { name: /Create Token/i })
    expect(submitBtn).not.toBeDisabled()

    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/Token Created Successfully!/i)).toBeInTheDocument()
    })
    expect(onSuccess).toHaveBeenCalled()
  })
})

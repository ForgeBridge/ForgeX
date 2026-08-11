import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TransactionConfirmationModal, OrderDetails } from './TransactionConfirmationModal'

describe('TransactionConfirmationModal Component', () => {
  const mockOrder: OrderDetails = {
    type: 'buy',
    tokenSymbol: 'FORGE',
    tokenAmount: '500',
    estimatedCostOrPayout: '2.5000',
    minReceivedOrMaxCost: '2.5250',
    fee: '0.0350',
    slippagePercent: 1,
    accountAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
  }

  it('renders order details correctly when open', () => {
    render(
      <TransactionConfirmationModal
        isOpen={true}
        orderDetails={mockOrder}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Confirm Purchase')).toBeInTheDocument()
    expect(screen.getByText('500 $FORGE')).toBeInTheDocument()
    expect(screen.getByText(/2.5250 XLM/)).toBeInTheDocument()
    expect(screen.getByText('1%')).toBeInTheDocument()
    expect(screen.getByText('Confirm & Sign')).toBeInTheDocument()
  })

  it('calls onConfirm when Confirm & Sign button is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <TransactionConfirmationModal
        isOpen={true}
        orderDetails={mockOrder}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    const confirmBtn = screen.getByRole('button', { name: 'Confirm & Sign' })
    fireEvent.click(confirmBtn)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Cancel or close icon is clicked', () => {
    const onClose = vi.fn()
    render(
      <TransactionConfirmationModal
        isOpen={true}
        orderDetails={mockOrder}
        onClose={onClose}
        onConfirm={vi.fn()}
      />
    )

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelBtn)
    expect(onClose).toHaveBeenCalledTimes(1)

    const closeIcon = screen.getByRole('button', { name: 'Close modal' })
    fireEvent.click(closeIcon)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('displays signing spinner state when isSubmitting is true', () => {
    render(
      <TransactionConfirmationModal
        isOpen={true}
        orderDetails={mockOrder}
        isSubmitting={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByText('Signing in Wallet…')).toBeInTheDocument()
  })
})

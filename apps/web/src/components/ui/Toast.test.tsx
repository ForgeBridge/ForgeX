import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ToastContainer } from './Toast'
import { useToastStore } from '../../hooks/useToast'

describe('Toast Notification System', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useToastStore.setState({ toasts: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders toast with title, message, and explorer link', () => {
    act(() => {
      useToastStore.getState().addToast({
        type: 'success',
        title: 'Transaction Confirmed',
        message: 'Bought 100 FORGE successfully',
        txHash: '1234567890abcdef',
        explorerUrl: 'https://stellar.expert/explorer/testnet/tx/1234567890abcdef',
      })
    })

    render(<ToastContainer />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Transaction Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Bought 100 FORGE successfully')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /View on Stellar Expert/i })
    expect(link).toHaveAttribute('href', 'https://stellar.expert/explorer/testnet/tx/1234567890abcdef')
  })

  it('renders error toast with role="alert"', () => {
    act(() => {
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Transaction Failed',
        message: 'Insufficient balance',
      })
    })

    render(<ToastContainer />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Transaction Failed')).toBeInTheDocument()
    expect(screen.getByText('Insufficient balance')).toBeInTheDocument()
  })

  it('allows manual dismissal of toast', () => {
    act(() => {
      useToastStore.getState().addToast({
        type: 'info',
        title: 'Network Switched',
      })
    })

    render(<ToastContainer />)

    const dismissBtn = screen.getByRole('button', { name: 'Dismiss notification' })
    fireEvent.click(dismissBtn)

    expect(screen.queryByText('Network Switched')).not.toBeInTheDocument()
  })

  it('auto-dismisses toast after durationMs timeout', () => {
    act(() => {
      useToastStore.getState().addToast({
        type: 'success',
        title: 'Auto Dismissing',
        durationMs: 3000,
      })
    })

    render(<ToastContainer />)
    expect(screen.getByText('Auto Dismissing')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.queryByText('Auto Dismissing')).not.toBeInTheDocument()
  })
})

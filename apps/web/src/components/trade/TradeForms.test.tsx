import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BuyForm } from './BuyForm'
import { SellForm } from './SellForm'
import { TradePanel } from './TradePanel'
import { useWalletStore } from '../../hooks/useWallet'

describe('Trade Forms (BuyForm, SellForm, TradePanel)', () => {
  beforeEach(() => {
    useWalletStore.setState({
      address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      isConnected: true,
      isConnecting: false,
      error: null,
    })
  })

  describe('BuyForm', () => {
    it('renders amount input and buy button', () => {
      render(<BuyForm tokenSymbol="FORGE" tokenPrice="0.005" />)
      expect(screen.getByLabelText(/Amount \(FORGE\)/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Buy FORGE/i })).toBeInTheDocument()
    })

    it('submits buy transaction and triggers onSuccess', async () => {
      const onSuccess = vi.fn()
      render(<BuyForm tokenSymbol="FORGE" onSuccess={onSuccess} />)

      const amountInput = screen.getByLabelText(/Amount \(FORGE\)/i)
      fireEvent.change(amountInput, { target: { value: '100' } })

      const buyBtn = screen.getByRole('button', { name: /Buy FORGE/i })
      fireEvent.click(buyBtn)

      await waitFor(() => {
        expect(screen.getByText(/Successfully purchased 100 FORGE!/i)).toBeInTheDocument()
      })
      expect(onSuccess).toHaveBeenCalledWith({ amount: '100' })
    })
  })

  describe('SellForm', () => {
    it('renders balance and allows setting max balance', () => {
      render(<SellForm tokenSymbol="FORGE" userBalance="500" />)
      const maxBtn = screen.getByText(/500 FORGE \(Max\)/i)
      fireEvent.click(maxBtn)

      const amountInput = screen.getByLabelText(/Amount \(FORGE\)/i) as HTMLInputElement
      expect(amountInput.value).toBe('500')
    })

    it('submits sell transaction and triggers onSuccess', async () => {
      const onSuccess = vi.fn()
      render(<SellForm tokenSymbol="FORGE" onSuccess={onSuccess} />)

      const amountInput = screen.getByLabelText(/Amount \(FORGE\)/i)
      fireEvent.change(amountInput, { target: { value: '50' } })

      const sellBtn = screen.getByRole('button', { name: /Sell FORGE/i })
      fireEvent.click(sellBtn)

      await waitFor(() => {
        expect(screen.getByText(/Successfully sold 50 FORGE!/i)).toBeInTheDocument()
      })
      expect(onSuccess).toHaveBeenCalledWith({ amount: '50' })
    })
  })

  describe('TradePanel', () => {
    it('switches between Buy and Sell tabs', () => {
      render(<TradePanel tokenSymbol="FORGE" />)
      expect(screen.getByRole('button', { name: /Buy FORGE/i })).toBeInTheDocument()

      const sellTab = screen.getByRole('button', { name: /^Sell$/i })
      fireEvent.click(sellTab)

      expect(screen.getByRole('button', { name: /Sell FORGE/i })).toBeInTheDocument()
    })
  })
})

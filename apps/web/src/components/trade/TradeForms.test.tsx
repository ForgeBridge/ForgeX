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

  describe('Wallet Gating', () => {
    it('renders Connect Wallet CTA when wallet is disconnected in BuyForm', () => {
      const connectMock = vi.fn()
      useWalletStore.setState({ isConnected: false, address: null, connect: connectMock })

      render(<BuyForm tokenSymbol="FORGE" />)
      const connectBtn = screen.getByRole('button', { name: /Connect Wallet to Buy/i })
      expect(connectBtn).toBeInTheDocument()

      fireEvent.click(connectBtn)
      expect(connectMock).toHaveBeenCalledTimes(1)
    })

    it('renders Connect Wallet CTA when wallet is disconnected in SellForm', () => {
      const connectMock = vi.fn()
      useWalletStore.setState({ isConnected: false, address: null, connect: connectMock })

      render(<SellForm tokenSymbol="FORGE" />)
      const connectBtn = screen.getByRole('button', { name: /Connect Wallet to Sell/i })
      expect(connectBtn).toBeInTheDocument()

      fireEvent.click(connectBtn)
      expect(connectMock).toHaveBeenCalledTimes(1)
    })

    it('renders Connect prompt in TradePanel when wallet is disconnected', () => {
      useWalletStore.setState({ isConnected: false, address: null })
      render(<TradePanel tokenSymbol="FORGE" />)
      expect(screen.getByText(/Connect Freighter wallet to trade \$FORGE/i)).toBeInTheDocument()
    })
  })

  describe('BuyForm', () => {
    it('renders amount input and buy button', () => {
      render(<BuyForm tokenSymbol="FORGE" tokenPrice="0.005" />)
      expect(screen.getByLabelText(/Amount \(FORGE\)/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Buy FORGE/i })).toBeInTheDocument()
    })

    it('opens confirmation modal and submits buy transaction', async () => {
      const onSuccess = vi.fn()
      render(<BuyForm tokenSymbol="FORGE" onSuccess={onSuccess} />)

      const amountInput = screen.getByLabelText(/Amount \(FORGE\)/i)
      fireEvent.change(amountInput, { target: { value: '100' } })

      const buyBtn = screen.getByRole('button', { name: /Buy FORGE/i })
      fireEvent.click(buyBtn)

      // Opens confirmation modal
      const confirmBtn = screen.getByRole('button', { name: 'Confirm & Sign' })
      expect(confirmBtn).toBeInTheDocument()
      fireEvent.click(confirmBtn)

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

    it('opens confirmation modal and submits sell transaction', async () => {
      const onSuccess = vi.fn()
      render(<SellForm tokenSymbol="FORGE" onSuccess={onSuccess} />)

      const amountInput = screen.getByLabelText(/Amount \(FORGE\)/i)
      fireEvent.change(amountInput, { target: { value: '50' } })

      const sellBtn = screen.getByRole('button', { name: /Sell FORGE/i })
      fireEvent.click(sellBtn)

      // Opens confirmation modal
      const confirmBtn = screen.getByRole('button', { name: 'Confirm & Sign' })
      expect(confirmBtn).toBeInTheDocument()
      fireEvent.click(confirmBtn)

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

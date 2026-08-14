import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { RecentTrades, TradeItem } from './RecentTrades'

const mockTrades: TradeItem[] = [
  {
    id: 'tx_1',
    type: 'buy',
    tokenAmount: '50000',
    xlmAmount: '5.00',
    price: '0.0001',
    account: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    timestamp: Math.floor(Date.now() / 1000) - 60,
  },
  {
    id: 'tx_2',
    type: 'sell',
    tokenAmount: '20000',
    xlmAmount: '2.00',
    price: '0.0001',
    account: 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBWHF',
    timestamp: Math.floor(Date.now() / 1000) - 300,
  },
]

describe('RecentTrades Component', () => {
  it('renders recent trades table with buy and sell badges', () => {
    render(<RecentTrades trades={mockTrades} tokenSymbol="FORGE" network="testnet" />)

    expect(screen.getByText('Recent Trades')).toBeInTheDocument()
    expect(screen.getByText('buy')).toBeInTheDocument()
    expect(screen.getByText('sell')).toBeInTheDocument()
    expect(screen.getByText('50,000 FORGE')).toBeInTheDocument()
    expect(screen.getByText('20,000 FORGE')).toBeInTheDocument()
  })

  it('renders empty state when no trades exist', () => {
    render(<RecentTrades trades={[]} tokenSymbol="FORGE" />)
    expect(screen.getByText(/No trades yet\. Be the first to trade!/i)).toBeInTheDocument()
  })
})

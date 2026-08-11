import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TokenStatsRow, TokenStats } from './TokenStatsRow'

describe('TokenStatsRow Component', () => {
  const mockStats: TokenStats = {
    price: '0.0001',
    priceChange24h: 12.5,
    marketCap: '100,000',
    reserveBalance: '10,000',
    totalSupply: '1,000,000,000',
    circulatingSupply: '500,000,000',
    volume24h: '25,400',
    tradeCount24h: 42,
    graduationThreshold: '50,000',
  }

  it('renders all key financial metrics accurately', () => {
    render(<TokenStatsRow stats={mockStats} />)

    expect(screen.getByText('0.0001')).toBeInTheDocument()
    expect(screen.getByText('+12.50%')).toBeInTheDocument()
    expect(screen.getByText(/100,000/)).toBeInTheDocument()
    expect(screen.getAllByText(/10,000/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/25,400/)).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('handles negative price change display', () => {
    const negativeStats: TokenStats = {
      ...mockStats,
      priceChange24h: -3.75,
    }
    render(<TokenStatsRow stats={negativeStats} />)
    expect(screen.getByText('-3.75%')).toBeInTheDocument()
  })

  it('calculates graduation progress accurately (10,000 / 50,000 = 20.0%)', () => {
    render(<TokenStatsRow stats={mockStats} />)

    const progressbar = screen.getByRole('progressbar', { name: /Graduation progress/i })
    expect(progressbar).toHaveAttribute('aria-valuenow', '20')
    expect(screen.getByText(/20.0%/)).toBeInTheDocument()
  })
})

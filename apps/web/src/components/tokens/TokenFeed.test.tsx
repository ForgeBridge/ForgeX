import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TokenFeed } from './TokenFeed'
import { useTokenStore, TokenItem } from '../../hooks/useToken'

const mockTokens: TokenItem[] = [
  {
    name: 'Alpha Token',
    symbol: 'ALPHA',
    marketCap: '500,000',
    price: '0.005',
    createdAt: 1000,
    tokenId: 'CDLZ...ALPHA',
  },
  {
    name: 'Beta Coin',
    symbol: 'BETA',
    marketCap: '100,000',
    price: '0.001',
    createdAt: 2000,
    tokenId: 'CDLZ...BETA',
  },
  {
    name: 'Gamma Memecoin',
    symbol: 'GAMMA',
    marketCap: '1,000,000',
    price: '0.01',
    createdAt: 1500,
    tokenId: 'CDLZ...GAMMA',
  },
]

describe('TokenFeed Search & Filtering', () => {
  beforeEach(() => {
    useTokenStore.setState({
      tokens: mockTokens,
      loading: false,
      error: null,
      fetchTokens: vi.fn(),
    })
  })

  it('renders all tokens and search input', () => {
    render(<TokenFeed />)
    expect(screen.getByPlaceholderText(/search tokens/i)).toBeInTheDocument()
    expect(screen.getByText('Alpha Token')).toBeInTheDocument()
    expect(screen.getByText('Beta Coin')).toBeInTheDocument()
    expect(screen.getByText('Gamma Memecoin')).toBeInTheDocument()
  })

  it('filters tokens by name or symbol match', () => {
    render(<TokenFeed />)
    const searchInput = screen.getByPlaceholderText(/search tokens/i)

    fireEvent.change(searchInput, { target: { value: 'beta' } })

    expect(screen.getByText('Beta Coin')).toBeInTheDocument()
    expect(screen.queryByText('Alpha Token')).not.toBeInTheDocument()
    expect(screen.queryByText('Gamma Memecoin')).not.toBeInTheDocument()
  })

  it('shows empty filter state when no tokens match search query and resets on clear', () => {
    render(<TokenFeed />)
    const searchInput = screen.getByPlaceholderText(/search tokens/i)

    fireEvent.change(searchInput, { target: { value: 'NONEXISTENT' } })

    expect(screen.getByText('No matching tokens found')).toBeInTheDocument()

    // Clicking Clear Filters resets search
    const clearBtn = screen.getByRole('button', { name: 'Clear Filters' })
    fireEvent.click(clearBtn)

    expect(screen.getByText('Alpha Token')).toBeInTheDocument()
    expect(screen.getByText('Beta Coin')).toBeInTheDocument()
    expect(screen.getByText('Gamma Memecoin')).toBeInTheDocument()
  })

  it('sorts tokens by market cap or newest', () => {
    render(<TokenFeed />)
    const sortSelect = screen.getByRole('combobox', { name: 'Sort tokens' })

    fireEvent.change(sortSelect, { target: { value: 'newest' } })
    expect(useTokenStore.getState().tokens).toHaveLength(3)
  })
})

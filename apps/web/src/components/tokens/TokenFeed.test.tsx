import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

describe('TokenFeed Search, Filtering & Pagination', () => {
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
    expect(screen.getByLabelText(/Search tokens/i)).toBeInTheDocument()
    expect(screen.getByText('Alpha Token')).toBeInTheDocument()
    expect(screen.getByText('Beta Coin')).toBeInTheDocument()
    expect(screen.getByText('Gamma Memecoin')).toBeInTheDocument()
  })

  it('filters tokens by name or symbol match', () => {
    render(<TokenFeed />)
    const searchInput = screen.getByLabelText(/Search tokens/i)

    fireEvent.change(searchInput, { target: { value: 'beta' } })

    expect(screen.getByText('Beta Coin')).toBeInTheDocument()
    expect(screen.queryByText('Alpha Token')).not.toBeInTheDocument()
    expect(screen.queryByText('Gamma Memecoin')).not.toBeInTheDocument()
  })

  it('shows empty filter state when no tokens match search query and resets on clear', () => {
    render(<TokenFeed />)
    const searchInput = screen.getByLabelText(/Search tokens/i)

    fireEvent.change(searchInput, { target: { value: 'NONEXISTENT' } })

    expect(screen.getByText('No matching tokens')).toBeInTheDocument()

    // Clicking Clear Search resets search
    const clearBtn = screen.getByRole('button', { name: 'Clear Search' })
    fireEvent.click(clearBtn)

    expect(screen.getByText('Alpha Token')).toBeInTheDocument()
    expect(screen.getByText('Beta Coin')).toBeInTheDocument()
    expect(screen.getByText('Gamma Memecoin')).toBeInTheDocument()
  })

  it('supports pagination and loads more tokens on button click', async () => {
    // Sorted by marketCap desc: Gamma, Alpha, Beta
    render(<TokenFeed pageSize={2} />)

    expect(screen.getByText(/Showing 2 of 3/)).toBeInTheDocument()
    expect(screen.getByText('Gamma Memecoin')).toBeInTheDocument()
    expect(screen.getByText('Alpha Token')).toBeInTheDocument()

    const loadMoreBtn = screen.getByRole('button', { name: 'Load More' })
    expect(loadMoreBtn).toBeInTheDocument()

    fireEvent.click(loadMoreBtn)

    await waitFor(() => {
      expect(screen.getByText(/Showing 3 of 3/)).toBeInTheDocument()
      expect(screen.getByText('Beta Coin')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument()
    })
  })
})
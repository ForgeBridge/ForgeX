import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Spinner } from './Spinner'
import { PageLoader } from './PageLoader'
import { TokenFeed } from '../tokens/TokenFeed'

describe('Loading States (Spinner, PageLoader, TokenFeed)', () => {
  it('renders accessible Spinner with role="status"', () => {
    render(<Spinner size="lg" />)
    const spinner = screen.getByRole('status')
    expect(spinner).toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders PageLoader with customizable message', () => {
    render(<PageLoader message="Fetching tokens..." />)
    expect(screen.getByText('Fetching tokens...')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders TokenCardSkeleton items when TokenFeed is in loading state', () => {
    render(<TokenFeed loading={true} />)
    expect(screen.getAllByRole('status', { name: 'Loading token...' }).length).toBeGreaterThan(0)
  })

  it('renders tokens when TokenFeed loading finishes with tokens provided', () => {
    const mockTokens = [
      { name: 'ForgeX Doge', symbol: 'FDOGE', marketCap: '12,450', price: '0.00001', createdAt: Date.now() / 1000 },
    ]
    render(<TokenFeed loading={false} tokens={mockTokens} />)
    expect(screen.getByText(/ForgeX Doge/i)).toBeInTheDocument()
  })
})

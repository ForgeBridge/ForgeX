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

  it('renders PageLoader when TokenFeed is in loading state', () => {
    render(<TokenFeed loading={true} />)
    expect(screen.getByText(/Loading tokens from Soroban…/i)).toBeInTheDocument()
  })

  it('renders tokens when TokenFeed loading finishes', () => {
    render(<TokenFeed loading={false} />)
    expect(screen.getByText(/ForgeX Doge/i)).toBeInTheDocument()
  })
})

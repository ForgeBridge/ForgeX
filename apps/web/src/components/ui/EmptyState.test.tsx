import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EmptyState } from './EmptyState'
import { TokenFeed } from '../tokens/TokenFeed'
import { useTokenStore } from '../../hooks/useToken'

describe('EmptyState and TokenFeed Empty States', () => {
  beforeEach(() => {
    useTokenStore.setState({
      tokens: [],
      loading: false,
      error: null,
      fetchTokens: vi.fn(),
    })
  })

  it('renders EmptyState title, description, and link action', () => {
    render(
      <EmptyState
        title="No Transactions"
        description="Your transaction history will show up here."
        actionLabel="Start Trading"
        actionHref="/tokens"
      />
    )

    expect(screen.getByRole('region', { name: 'No Transactions' })).toBeInTheDocument()
    expect(screen.getByText('No Transactions')).toBeInTheDocument()
    expect(screen.getByText('Your transaction history will show up here.')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Start Trading' })
    expect(link).toHaveAttribute('href', '/tokens')
  })

  it('renders EmptyState with button callback action', () => {
    const handleAction = vi.fn()
    render(
      <EmptyState
        title="Empty Cache"
        actionLabel="Refresh Data"
        onAction={handleAction}
      />
    )

    const btn = screen.getByRole('button', { name: 'Refresh Data' })
    fireEvent.click(btn)
    expect(handleAction).toHaveBeenCalledTimes(1)
  })

  it('renders EmptyState in TokenFeed when no tokens are available', () => {
    render(<TokenFeed tokens={[]} />)

    expect(screen.getByText('No Tokens Found')).toBeInTheDocument()
    expect(screen.getByText(/No bonding curve tokens have been forged/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Token' })).toHaveAttribute('href', '/create')
  })
})

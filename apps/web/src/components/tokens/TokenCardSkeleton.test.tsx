import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TokenCardSkeleton, TokenFeedSkeleton } from './TokenCardSkeleton'

describe('TokenCardSkeleton Component', () => {
  it('renders single token card skeleton with status accessibility role', () => {
    render(<TokenCardSkeleton />)
    expect(screen.getByRole('status', { name: 'Loading token...' })).toBeInTheDocument()
  })

  it('renders grid with specified count of skeleton cards', () => {
    render(<TokenFeedSkeleton count={4} />)
    expect(screen.getAllByRole('status', { name: 'Loading token...' })).toHaveLength(4)
  })
})

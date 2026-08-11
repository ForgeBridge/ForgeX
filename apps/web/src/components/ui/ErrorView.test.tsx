import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ErrorView } from './ErrorView'
import { TokenFeed } from '../tokens/TokenFeed'

describe('ErrorView and TokenFeed Error States', () => {
  it('renders default error message and alert role', () => {
    render(<ErrorView />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Failed to load data')).toBeInTheDocument()
  })

  it('renders custom error title, message, and triggers onRetry', () => {
    const handleRetry = vi.fn()
    render(
      <ErrorView
        title="Network Connection Error"
        message="RPC timeout after 10 seconds"
        onRetry={handleRetry}
        retryLabel="Try Again"
      />
    )
    expect(screen.getByText('Network Connection Error')).toBeInTheDocument()
    expect(screen.getByText('RPC timeout after 10 seconds')).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: 'Try Again' })
    fireEvent.click(retryBtn)
    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it('renders ErrorView when TokenFeed has an error and calls onRetry', () => {
    const handleRetry = vi.fn()
    render(<TokenFeed error="Could not reach Soroban RPC" onRetry={handleRetry} />)

    expect(screen.getByText('Could not reach Soroban RPC')).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: /retry/i })
    fireEvent.click(retryBtn)
    expect(handleRetry).toHaveBeenCalledTimes(1)
  })
})

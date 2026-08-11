import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ErrorPage from './error'

vi.mock('next/link', () => ({
  default: ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

describe('ErrorPage Boundary Component', () => {
  it('renders error message and triggers reset on Try Again click', () => {
    const resetMock = vi.fn()
    const mockError = Object.assign(new Error('RPC node connection timed out'), {
      digest: 'ERR_12345',
    })

    render(<ErrorPage error={mockError} reset={resetMock} />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('RPC node connection timed out')).toBeInTheDocument()
    expect(screen.getByText(/ERR_12345/)).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: 'Try Again' })
    fireEvent.click(retryBtn)
    expect(resetMock).toHaveBeenCalledTimes(1)
  })
})

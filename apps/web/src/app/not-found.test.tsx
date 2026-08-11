import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import NotFound from './not-found'

vi.mock('next/link', () => ({
  default: ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

describe('NotFound Page Component', () => {
  it('renders 404 header and navigation CTAs', () => {
    render(<NotFound />)
    expect(screen.getByText('404 — Page Not Found')).toBeInTheDocument()
    expect(screen.getByText('Back to Token Feed')).toBeInTheDocument()
    expect(screen.getByText('Create New Token')).toBeInTheDocument()
  })
})

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { RiskDisclaimer } from './RiskDisclaimer'

describe('RiskDisclaimer Component', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders risk disclaimer banner with warning text', () => {
    render(<RiskDisclaimer />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/bonding curve & trading risk notice/i)).toBeInTheDocument()
  })

  it('toggles expanded bullet points on click', () => {
    render(<RiskDisclaimer />)

    const toggleBtn = screen.getByRole('button', { name: /read risks/i })
    fireEvent.click(toggleBtn)

    expect(screen.getByText(/all transactions on stellar soroban are final/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /less info/i })).toBeInTheDocument()
  })

  it('dismisses when close button is clicked and stores in localStorage', () => {
    render(<RiskDisclaimer storageKey="test_disclaimer_key" />)

    const dismissBtn = screen.getByLabelText('Dismiss risk disclaimer')
    fireEvent.click(dismissBtn)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(localStorage.getItem('test_disclaimer_key')).toBe('true')
  })
})

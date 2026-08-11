import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QuotePreview } from './QuotePreview'

describe('QuotePreview', () => {
  it('renders nothing when amount is 0, negative, or invalid', () => {
    const { container: c1 } = render(
      <QuotePreview type="buy" tokenAmount="" tokenPrice="0.001" tokenSymbol="TEST" />,
    )
    expect(c1.firstChild).toBeNull()

    const { container: c2 } = render(
      <QuotePreview type="buy" tokenAmount="-10" tokenPrice="0.001" tokenSymbol="TEST" />,
    )
    expect(c2.firstChild).toBeNull()
  })

  it('calculates buy quote with estimated cost and protocol fee', () => {
    // 1000 tokens * 0.01 XLM = 10 XLM gross + 1% fee (0.1 XLM) = 10.1 XLM
    render(
      <QuotePreview
        type="buy"
        tokenAmount="1000"
        tokenPrice="0.01"
        tokenSymbol="FORGE"
        feePercent={1}
      />,
    )

    expect(screen.getByText(/Estimated Total Cost/i)).toBeInTheDocument()
    expect(screen.getByText('10.100000 XLM')).toBeInTheDocument()
    expect(screen.getByText('0.100000 XLM')).toBeInTheDocument()
    expect(screen.getByText(/Min Tokens Received/i)).toBeInTheDocument()
  })

  it('calculates sell quote with estimated payout', () => {
    // 1000 tokens * 0.01 XLM = 10 XLM gross - 1% fee (0.1 XLM) = 9.9 XLM
    render(
      <QuotePreview
        type="sell"
        tokenAmount="1000"
        tokenPrice="0.01"
        tokenSymbol="FORGE"
        feePercent={1}
      />,
    )

    expect(screen.getByText(/Estimated Payout/i)).toBeInTheDocument()
    expect(screen.getByText('9.900000 XLM')).toBeInTheDocument()
    expect(screen.getByText(/Min XLM Received/i)).toBeInTheDocument()
  })
})

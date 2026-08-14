import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SlippageTolerance } from './SlippageTolerance'
import { useTradeStore } from '../../hooks/useBondingCurve'

describe('SlippageTolerance', () => {
  beforeEach(() => {
    useTradeStore.setState({
      buyAmount: '',
      sellAmount: '',
      slippage: 1,
      estimatedCost: '0',
      estimatedPayout: '0',
    })
  })

  it('renders preset slippage buttons with default selected', () => {
    render(<SlippageTolerance />)
    expect(screen.getByRole('button', { name: '0.5%' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1%' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2%' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5%' })).toBeInTheDocument()
  })

  it('updates store slippage when a preset button is clicked', () => {
    render(<SlippageTolerance />)
    const btn5 = screen.getByRole('button', { name: '5%' })
    fireEvent.click(btn5)

    expect(useTradeStore.getState().slippage).toBe(5)
  })

  it('supports custom slippage input and displays warning for high slippage', () => {
    render(<SlippageTolerance />)
    const customInput = screen.getByPlaceholderText(/Custom/i)

    fireEvent.change(customInput, { target: { value: '8' } })
    expect(useTradeStore.getState().slippage).toBe(8)
    expect(screen.getByText(/High slippage increases frontrunning risk/i)).toBeInTheDocument()
  })

  it('invokes onChange callback when passed', () => {
    const onChange = vi.fn()
    render(<SlippageTolerance onChange={onChange} />)

    const btn2 = screen.getByRole('button', { name: '2%' })
    fireEvent.click(btn2)

    expect(onChange).toHaveBeenCalledWith(2)
  })
})

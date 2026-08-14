import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PriceChart } from './PriceChart'

vi.mock('lightweight-charts', () => {
  const mockSeries = {
    setData: vi.fn(),
  }
  const mockChart = {
    addAreaSeries: vi.fn().mockReturnValue(mockSeries),
    timeScale: vi.fn().mockReturnValue({ fitContent: vi.fn() }),
    applyOptions: vi.fn(),
    remove: vi.fn(),
  }
  return {
    createChart: vi.fn().mockReturnValue(mockChart),
    ColorType: { Solid: 'solid' },
  }
})

// Mock ResizeObserver for jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any

describe('PriceChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders symbol, current price, time range buttons, and chart container', () => {
    render(<PriceChart symbol="FORGE" currentPrice="0.0025" />)

    expect(screen.getByText(/FORGE Price/i)).toBeInTheDocument()
    expect(screen.getByText(/0.0025/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1H' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '24H' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '7D' })).toBeInTheDocument()
    expect(screen.getByTestId('price-chart-canvas')).toBeInTheDocument()
  })

  it('allows switching time range filters', () => {
    render(<PriceChart symbol="FORGE" currentPrice="0.0025" />)

    const btn7d = screen.getByRole('button', { name: '7D' })
    fireEvent.click(btn7d)

    expect(btn7d).toHaveClass('bg-background')
  })

  it('handles custom data points', () => {
    const data = [
      { time: 1700000000, value: 0.0001 },
      { time: 1700003600, value: 0.00015 },
      { time: 1700007200, value: 0.0002 },
    ]

    render(<PriceChart data={data} symbol="FORGE" currentPrice="0.0002" />)
    expect(screen.getByText(/FORGE Price/i)).toBeInTheDocument()
  })
})

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Journey } from './Journey'
import { useJourneyStore } from './useJourney'

vi.mock('next/link', () => ({
  default: ({ children, href, onClick, className }: any) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}))

describe('Journey', () => {
  beforeEach(() => {
    useJourneyStore.setState({ index: 0 })
  })

  it('renders the opening chapter with chrome', () => {
    render(<Journey />)

    expect(
      screen.getByRole('button', { name: 'ForgeX home — restart journey' })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'ForgeX' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Start' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Board' })).toBeInTheDocument()
    expect(screen.getByText('Chapter 1 of 5: Opening')).toBeInTheDocument()
  })

  it('advances through Start and announces chapters', () => {
    render(<Journey />)

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(useJourneyStore.getState().index).toBe(1)
    expect(screen.getByText('Chapter 2 of 5: The curve')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Back' })
    ).toBeInTheDocument()
  })

  it('jumps to the board from the footer', () => {
    render(<Journey />)

    fireEvent.click(screen.getByRole('button', { name: 'Board' }))

    expect(useJourneyStore.getState().index).toBe(3)
    expect(screen.getByText('Chapter 4 of 5: The board')).toBeInTheDocument()
  })

  it('navigates with dots and arrow keys', () => {
    render(<Journey />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Go to chapter 3: Forge' })
    )
    expect(useJourneyStore.getState().index).toBe(2)

    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(useJourneyStore.getState().index).toBe(3)

    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(useJourneyStore.getState().index).toBe(2)
  })

  it('restarts the journey from the wordmark', () => {
    useJourneyStore.setState({ index: 3 })
    render(<Journey />)

    fireEvent.click(
      screen.getByRole('button', { name: 'ForgeX home — restart journey' })
    )

    expect(useJourneyStore.getState().index).toBe(0)
  })
})

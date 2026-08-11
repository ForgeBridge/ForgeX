import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Header } from './Header'
import { useWalletStore } from '../../hooks/useWallet'

vi.mock('next/link', () => ({
  default: ({ children, href, onClick, className }: any) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}))

describe('Header Component', () => {
  beforeEach(() => {
    useWalletStore.setState({
      address: null,
      balance: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    })
  })

  it('renders desktop brand and navigation links', () => {
    render(<Header />)
    expect(screen.getByText('ForgeX')).toBeInTheDocument()
    expect(screen.getAllByText('Feed')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Create')[0]).toBeInTheDocument()
  })

  it('toggles mobile menu drawer on mobile hamburger button click', () => {
    render(<Header />)

    const menuButton = screen.getByRole('button', { name: 'Open mobile menu' })
    expect(menuButton).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Mobile Navigation' })).not.toBeInTheDocument()

    fireEvent.click(menuButton)
    expect(screen.getByRole('dialog', { name: 'Mobile Navigation' })).toBeInTheDocument()
    expect(screen.getByText('Token Feed')).toBeInTheDocument()
    expect(screen.getByText('Create Token')).toBeInTheDocument()

    // Close on second click
    fireEvent.click(screen.getByRole('button', { name: 'Close mobile menu' }))
    expect(screen.queryByRole('dialog', { name: 'Mobile Navigation' })).not.toBeInTheDocument()
  })

  it('closes mobile menu on Escape key press', () => {
    render(<Header />)

    const menuButton = screen.getByRole('button', { name: 'Open mobile menu' })
    fireEvent.click(menuButton)
    expect(screen.getByRole('dialog', { name: 'Mobile Navigation' })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Mobile Navigation' })).not.toBeInTheDocument()
  })
})

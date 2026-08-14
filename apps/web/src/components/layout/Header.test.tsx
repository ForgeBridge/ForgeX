import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
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
    expect(screen.getAllByRole('link', { name: 'Explore' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Create' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Dashboard' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Settings' }).length).toBeGreaterThan(0)
  })

  it('toggles mobile menu drawer on hamburger button click', async () => {
    render(<Header />)

    const menuButton = screen.getByRole('button', { name: 'Open menu' })
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByRole('link', { name: 'Explore' })).toHaveLength(1)

    fireEvent.click(menuButton)
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: 'Explore' })).toHaveLength(2)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }))
    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: 'Explore' })).toHaveLength(1)
    })
  })

  it('closes mobile menu on Escape key press', async () => {
    render(<Header />)

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: 'Explore' })).toHaveLength(2)
    })

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: 'Explore' })).toHaveLength(1)
    })
  })
})

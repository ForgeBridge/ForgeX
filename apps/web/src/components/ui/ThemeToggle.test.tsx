import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { ThemeToggle } from './ThemeToggle'
import { useThemeStore } from '../../hooks/useTheme'

describe('ThemeToggle Component & useThemeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    useThemeStore.setState({ theme: 'dark' })
  })

  it('renders theme toggle button with accessible label', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument()
  })

  it('toggles theme from dark to light on click and updates data-theme attribute', () => {
    render(<ThemeToggle />)

    const toggleBtn = screen.getByRole('button', { name: /switch to light mode/i })
    fireEvent.click(toggleBtn)

    expect(useThemeStore.getState().theme).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('forgex_theme')).toBe('light')
  })

  it('toggles theme from light back to dark on click', () => {
    localStorage.setItem('forgex_theme', 'light')
    useThemeStore.setState({ theme: 'light' })

    render(<ThemeToggle />)

    const toggleBtn = screen.getByRole('button', { name: /switch to dark mode/i })
    fireEvent.click(toggleBtn)

    expect(useThemeStore.getState().theme).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('forgex_theme')).toBe('dark')
  })
})

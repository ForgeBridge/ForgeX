import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TokenAvatar } from './TokenAvatar'

describe('TokenAvatar Component', () => {
  it('renders image when valid imageUri is provided', () => {
    render(<TokenAvatar symbol="FDOGE" imageUri="https://example.com/logo.png" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/logo.png')
  })

  it('renders fallback initials identicon when imageUri is empty or invalid', () => {
    render(<TokenAvatar symbol="SPEPE" />)
    expect(screen.getByText('SP')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'SPEPE avatar' })).toBeInTheDocument()
  })

  it('falls back to initials identicon on image load error', () => {
    render(<TokenAvatar symbol="XLM" imageUri="https://example.com/non-existent.png" />)
    const img = screen.getByRole('img')
    fireEvent.error(img)

    expect(screen.getByText('XL')).toBeInTheDocument()
  })
})

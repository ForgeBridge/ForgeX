import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TokenDetailHeader, TokenDetailMetadata } from './TokenDetailHeader'

describe('TokenDetailHeader Component', () => {
  const mockMetadata: TokenDetailMetadata = {
    name: 'Forge Token',
    symbol: 'FORGE',
    tokenId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    curveId: 'CCLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    creator: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    createdAt: 1700000000,
    description: 'Autonomous bonding curve token for testing and trading on Stellar Soroban.',
    website: 'https://forgex.fi',
  }

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders all token metadata including name, symbol, and description', () => {
    render(<TokenDetailHeader metadata={mockMetadata} network="testnet" isLive={true} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Forge Token' })).toBeInTheDocument()
    expect(screen.getByText('$FORGE')).toBeInTheDocument()
    expect(screen.getByText(/Autonomous bonding curve token/i)).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('generates correct explorer link for testnet and website link', () => {
    render(<TokenDetailHeader metadata={mockMetadata} network="testnet" />)

    const explorerLink = screen.getByRole('link', { name: /Stellar Expert/i })
    expect(explorerLink).toHaveAttribute(
      'href',
      `https://stellar.expert/explorer/testnet/contract/${mockMetadata.tokenId}`
    )

    const websiteLink = screen.getByRole('link', { name: 'Website' })
    expect(websiteLink).toHaveAttribute('href', 'https://forgex.fi')
  })

  it('copies token ID, curve ID, and creator address to clipboard on click', async () => {
    render(<TokenDetailHeader metadata={mockMetadata} network="testnet" />)

    const copyTokenBtn = screen.getByRole('button', { name: 'Copy token ID' })
    fireEvent.click(copyTokenBtn)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockMetadata.tokenId)

    const copyCurveBtn = screen.getByRole('button', { name: 'Copy curve ID' })
    fireEvent.click(copyCurveBtn)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockMetadata.curveId)

    const copyCreatorBtn = screen.getByRole('button', { name: 'Copy creator address' })
    fireEvent.click(copyCreatorBtn)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockMetadata.creator)
  })
})

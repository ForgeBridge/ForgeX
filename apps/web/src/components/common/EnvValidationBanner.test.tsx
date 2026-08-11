import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EnvValidationBanner } from './EnvValidationBanner'
import * as envModule from '../../lib/env'

describe('EnvValidationBanner Component', () => {
  it('renders nothing when config is valid and has no warnings', () => {
    vi.spyOn(envModule, 'validateEnvConfig').mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      config: {
        network: 'testnet',
        rpcUrl: 'https://soroban-testnet.stellar.org',
        networkPassphrase: 'Test SDF Network',
        ipfsGateway: 'https://gateway.pinata.cloud',
      },
    })

    render(<EnvValidationBanner />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders error banner when configuration is invalid', () => {
    vi.spyOn(envModule, 'validateEnvConfig').mockReturnValue({
      isValid: false,
      errors: ['Invalid Soroban RPC URL: "bad-url"'],
      warnings: [],
      config: {
        network: 'testnet',
        rpcUrl: 'bad-url',
        networkPassphrase: 'Test SDF Network',
        ipfsGateway: 'https://gateway.pinata.cloud',
      },
    })

    render(<EnvValidationBanner />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/config error/i)).toBeInTheDocument()
    expect(screen.getByText(/invalid soroban rpc url/i)).toBeInTheDocument()

    const dismissBtn = screen.getByRole('button', { name: /dismiss config banner/i })
    fireEvent.click(dismissBtn)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

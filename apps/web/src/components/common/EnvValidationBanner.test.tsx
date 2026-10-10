import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EnvValidationBanner } from './EnvValidationBanner'
import * as envModule from '../../lib/env'
import type { EnvValidationResult } from '../../lib/env'

const ARC_STATUS_FACTORY = {
  enabled: false,
  chainId: 5042002,
  rpcUrl: 'https://rpc.testnet.arc.io',
  factoryAddress: null,
  quoteToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
} as const

const BASE_CONFIG = {
  network: 'testnet',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network',
  ipfsGateway: 'https://gateway.pinata.cloud',
} as const

function result(overrides: Partial<EnvValidationResult>): EnvValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: [],
    config: BASE_CONFIG,
    arc: ARC_STATUS_FACTORY,
    ...overrides,
  }
}

describe('EnvValidationBanner Component', () => {
  it('renders nothing when config is valid and has no warnings', () => {
    vi.spyOn(envModule, 'validateEnvConfig').mockReturnValue(result({ isValid: true }))

    render(<EnvValidationBanner />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders error banner when configuration is invalid', () => {
    vi.spyOn(envModule, 'validateEnvConfig').mockReturnValue(
      result({
        isValid: false,
        errors: ['Invalid Soroban RPC URL: "bad-url"'],
      }),
    )

    render(<EnvValidationBanner />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/config error/i)).toBeInTheDocument()
    expect(screen.getByText(/invalid soroban rpc url/i)).toBeInTheDocument()

    const dismissBtn = screen.getByRole('button', { name: /dismiss config banner/i })
    fireEvent.click(dismissBtn)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('surfaces Arc warnings the same way as Stellar ones', () => {
    vi.spyOn(envModule, 'validateEnvConfig').mockReturnValue(
      result({
        warnings: ['NEXT_PUBLIC_ARC_FACTORY_ADDRESS is unset, so Arc stays disabled.'],
      }),
    )

    render(<EnvValidationBanner />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/arc stays disabled/i)).toBeInTheDocument()
  })
})

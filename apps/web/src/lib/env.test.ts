import { describe, it, expect } from 'vitest'
import { isValidContractId, isValidUrl, validateEnvConfig } from './env'

describe('env configuration validation', () => {
  it('validates URLs correctly', () => {
    expect(isValidUrl('https://soroban-testnet.stellar.org')).toBe(true)
    expect(isValidUrl('http://localhost:8000')).toBe(true)
    expect(isValidUrl('invalid-url')).toBe(false)
    expect(isValidUrl('')).toBe(false)
  })

  it('validates Soroban contract IDs format', () => {
    expect(isValidContractId('CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM')).toBe(true)
    expect(isValidContractId('GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVTHG')).toBe(false) // Account address, not Contract ID
    expect(isValidContractId('C123')).toBe(false) // Too short
    expect(isValidContractId('')).toBe(false)
  })

  it('validates complete env config with defaults', () => {
    const result = validateEnvConfig({
      NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
      NEXT_PUBLIC_SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
    })

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.config.network).toBe('testnet')
    expect(result.config.rpcUrl).toBe('https://soroban-testnet.stellar.org')
  })

  it('detects invalid RPC URL in env config', () => {
    const result = validateEnvConfig({
      NEXT_PUBLIC_SOROBAN_RPC_URL: 'not-a-valid-url',
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

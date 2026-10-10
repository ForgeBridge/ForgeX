import { describe, expect, it } from 'vitest'

import { classifyError } from './errors'

describe('classifyError', () => {
  it('recognises a wallet rejection', () => {
    expect(classifyError(new Error('User rejected the request')).kind).toBe('user-rejected')
    expect(classifyError({ message: 'MetaMask Tx Signature: User denied transaction signature' }).kind).toBe(
      'user-rejected',
    )
  })

  it('recognises contract errors by name so users see a useful sentence', () => {
    expect(classifyError(new Error('execution reverted: SlippageExceeded()')).kind).toBe('slippage')
    expect(classifyError(new Error('DeadlineExpired')).kind).toBe('deadline')
    expect(classifyError(new Error('CapExceeded')).kind).toBe('cap')
    expect(classifyError(new Error('BuyExceedsMaximum')).kind).toBe('limits')
    expect(classifyError(new Error('ContractPausedError')).kind).toBe('paused')
    expect(classifyError(new Error('UnauthorizedError')).kind).toBe('unauthorized')
    expect(classifyError(new Error('ReentrancyGuard')).kind).toBe('reentrancy')
    expect(classifyError(new Error('TokenNotFound')).kind).toBe('not-found')
  })

  it('recognises funding problems separately from contract refusals', () => {
    expect(classifyError(new Error('insufficient funds for intrinsic transaction cost')).kind).toBe(
      'insufficient-funds',
    )
    expect(classifyError(new Error('ERC20: insufficient allowance')).kind).toBe('insufficient-allowance')
  })

  it('recognises a missing quote approval as the fixable problem it is', () => {
    // The curve pulls the quote with transferFrom, so a missing approval surfaces as
    // an allowance failure rather than a generic revert.
    expect(classifyError(new Error('ERC20InsufficientAllowance(0xcurve, 1000, 0)')).kind).toBe(
      'insufficient-allowance',
    )
  })

  it('does not mistake a contract revert for a network failure', () => {
    // A generic "execution reverted" is a contract refusal, not an RPC outage.
    expect(classifyError({ shortMessage: 'execution reverted (unknown custom error)' }).kind).toBe('unknown')
  })

  it('recognises Arc RPC failures', () => {
    expect(classifyError(new Error('eth_getLogs -32012: query exceeds block range')).kind).toBe('network')
    expect(classifyError(new Error('-32014 header not found')).kind).toBe('network')
    expect(classifyError(new Error('fetch failed')).kind).toBe('network')
  })

  it('falls back to a generic message for unknown errors', () => {
    const result = classifyError(new Error('something nobody has seen before'))
    expect(result.kind).toBe('unknown')
    expect(result.message).toMatch(/try again/i)
  })

  it('never leaks raw error text into the user message', () => {
    const result = classifyError(new Error('ERC20: transfer amount exceeds balance'))
    expect(result.message).not.toMatch(/ERC20/)
  })
})

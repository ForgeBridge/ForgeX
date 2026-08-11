import { describe, it, expect } from 'vitest'
import { metadata } from './layout'

describe('SEO Metadata Configuration', () => {
  it('defines comprehensive OpenGraph and Twitter metadata', () => {
    expect(metadata.title).toBeDefined()
    expect(metadata.description).toContain('Stellar')
    expect(metadata.openGraph).toBeDefined()
    expect(metadata.openGraph?.title).toContain('ForgeX')
    expect((metadata.twitter as Record<string, unknown>)?.card).toBe('summary_large_image')
    expect(metadata.keywords).toContain('Stellar')
    expect(metadata.keywords).toContain('Soroban')
  })
})

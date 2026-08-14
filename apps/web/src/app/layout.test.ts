import { describe, it, expect, vi } from 'vitest'
import { metadata } from './layout'

vi.mock('geist/font/sans', () => ({ GeistSans: { variable: '' } }))
vi.mock('geist/font/mono', () => ({ GeistMono: { variable: '' } }))

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

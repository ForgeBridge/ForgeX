import { describe, it, expect } from 'vitest'
import { resolveMediaUrl, getDeterministicGradient, IPFS_GATEWAY } from './ipfs'

describe('IPFS and Media Resolver (resolveMediaUrl)', () => {
  it('resolves ipfs:// protocol to gateway URL', () => {
    const cid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
    expect(resolveMediaUrl(`ipfs://${cid}`)).toBe(`${IPFS_GATEWAY}${cid}`)
    expect(resolveMediaUrl(`ipfs://ipfs/${cid}`)).toBe(`${IPFS_GATEWAY}${cid}`)
  })

  it('allows valid HTTPS URLs', () => {
    const httpsUrl = 'https://example.com/token-logo.png'
    expect(resolveMediaUrl(httpsUrl)).toBe(httpsUrl)
  })

  it('rejects unsafe URI schemes (javascript:, data:)', () => {
    expect(resolveMediaUrl('javascript:alert(1)')).toBeNull()
    expect(resolveMediaUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(resolveMediaUrl('file:///etc/passwd')).toBeNull()
  })

  it('handles null, undefined, and empty strings gracefully', () => {
    expect(resolveMediaUrl(null)).toBeNull()
    expect(resolveMediaUrl(undefined)).toBeNull()
    expect(resolveMediaUrl('')).toBeNull()
    expect(resolveMediaUrl('   ')).toBeNull()
  })

  it('returns consistent deterministic gradient for identical symbols', () => {
    const grad1 = getDeterministicGradient('FDOGE')
    const grad2 = getDeterministicGradient('FDOGE')
    expect(grad1).toBe(grad2)
    expect(typeof grad1).toBe('string')
  })
})

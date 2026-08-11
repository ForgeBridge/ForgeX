/**
 * IPFS Gateway and media URL resolver utilities.
 * 
 * Security:
 * - Sanitizes URI protocols to prevent javascript: or data: XSS attacks
 * - Only allows http:, https:, and ipfs: schemes
 */

export const IPFS_GATEWAY = 'https://ipfs.io/ipfs/'

export function resolveMediaUrl(uri?: string | null): string | null {
  if (!uri || typeof uri !== 'string') return null

  const trimmed = uri.trim()
  if (!trimmed) return null

  // IPFS URI handling: ipfs://<cid> or ipfs://ipfs/<cid>
  if (trimmed.startsWith('ipfs://')) {
    const path = trimmed.replace(/^ipfs:\/\/(ipfs\/)?/, '')
    return `${IPFS_GATEWAY}${path}`
  }

  // Safe HTTP/HTTPS handling
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString()
      }
    } catch {
      return null
    }
  }

  return null
}

const GRADIENT_PALETTES = [
  'from-amber-500 to-orange-600',
  'from-orange-500 to-red-600',
  'from-emerald-500 to-teal-600',
  'from-cyan-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-violet-600',
  'from-yellow-500 to-amber-600',
]

/**
 * Returns deterministic Tailwind gradient classes based on token symbol or address string.
 */
export function getDeterministicGradient(seed: string): string {
  if (!seed) return GRADIENT_PALETTES[0]

  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }

  const index = Math.abs(hash) % GRADIENT_PALETTES.length
  return GRADIENT_PALETTES[index]
}

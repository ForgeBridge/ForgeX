import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--forgex-surface)] border border-[var(--forgex-border)] mb-6 text-[var(--forgex-primary)] shadow-lg">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h1 className="text-4xl font-extrabold text-[var(--forgex-text)] mb-3">
        404 — Page Not Found
      </h1>

      <p className="text-[var(--forgex-text-muted)] text-base mb-8 max-w-md mx-auto leading-relaxed">
        The token, bonding curve, or page you are looking for does not exist on this network or has been relocated.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-lg bg-[var(--forgex-primary)] text-white font-medium hover:opacity-90 transition-opacity"
        >
          Back to Token Feed
        </Link>
        <Link
          href="/create"
          className="px-5 py-2.5 rounded-lg bg-[var(--forgex-surface)] border border-[var(--forgex-border)] text-[var(--forgex-text)] font-medium hover:opacity-90 transition-opacity"
        >
          Create New Token
        </Link>
      </div>
    </div>
  )
}

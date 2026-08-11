export function TokenCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading token..."
      className="bg-[var(--forgex-surface)] rounded-xl border border-[var(--forgex-border)] p-5 animate-pulse"
    >
      <div className="flex items-center gap-3.5 mb-4">
        {/* Avatar skeleton */}
        <div className="w-10 h-10 rounded-full bg-[var(--forgex-border)]/60 shrink-0" />

        <div className="min-w-0 flex-1 space-y-2">
          {/* Name skeleton */}
          <div className="h-4 bg-[var(--forgex-border)]/70 rounded w-3/4" />
          {/* Symbol skeleton */}
          <div className="h-3 bg-[var(--forgex-border)]/40 rounded w-1/3" />
        </div>
      </div>

      <div className="space-y-2 text-xs">
        {/* Market cap row */}
        <div className="flex justify-between py-1 border-b border-[var(--forgex-border)]/40">
          <div className="h-3 bg-[var(--forgex-border)]/50 rounded w-1/4" />
          <div className="h-3 bg-[var(--forgex-border)]/70 rounded w-1/3" />
        </div>
        {/* Price row */}
        <div className="flex justify-between pt-1">
          <div className="h-3 bg-[var(--forgex-border)]/50 rounded w-1/4" />
          <div className="h-3 bg-[var(--forgex-border)]/70 rounded w-1/4" />
        </div>
      </div>
    </div>
  )
}

export function TokenFeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      aria-label="Loading tokens grid"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <TokenCardSkeleton key={i} />
      ))}
    </div>
  )
}

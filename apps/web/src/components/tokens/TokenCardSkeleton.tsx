export function TokenCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading token..."
      className="bg-card rounded-lg border border-border p-4"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full skeleton shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 skeleton rounded w-3/4" />
          <div className="h-3 skeleton rounded w-1/3" />
        </div>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between py-1.5 border-t border-border">
          <div className="h-3 skeleton rounded w-1/4" />
          <div className="h-3 skeleton rounded w-1/3" />
        </div>
        <div className="flex justify-between pb-1">
          <div className="h-3 skeleton rounded w-1/4" />
          <div className="h-3 skeleton rounded w-1/4" />
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

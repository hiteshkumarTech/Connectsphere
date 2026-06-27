// Lightweight shimmer placeholders shown while content loads.
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

// Mirrors PostCard's structure so the feed doesn't jump when real posts arrive.
export function PostCardSkeleton() {
  return (
    <div className="border-b border-slate-100 bg-white px-4 py-4 dark:border-slate-800/80 dark:bg-slate-950 sm:rounded-2xl sm:border sm:shadow-card sm:dark:border-slate-800">
      <div className="flex items-start gap-3">
        <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="mt-3 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="mt-3 h-48 w-full rounded-xl" />
          <div className="mt-3 flex gap-6">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3 sm:space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

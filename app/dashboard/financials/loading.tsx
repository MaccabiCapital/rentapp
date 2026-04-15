export default function Loading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded bg-zinc-200" />
        <div className="flex gap-2">
          <div className="h-9 w-32 animate-pulse rounded bg-zinc-200" />
          <div className="h-9 w-32 animate-pulse rounded bg-zinc-200" />
          <div className="h-9 w-28 animate-pulse rounded bg-zinc-200" />
        </div>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-white"
          />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse border-b border-zinc-100 bg-zinc-50/30 last:border-b-0"
          />
        ))}
      </div>
    </div>
  )
}

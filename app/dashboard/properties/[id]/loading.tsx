export default function Loading() {
  return (
    <div>
      <div className="mb-4 h-4 w-48 animate-pulse rounded bg-zinc-200" />
      <div className="mb-2 h-8 w-64 animate-pulse rounded bg-zinc-200" />
      <div className="h-4 w-80 animate-pulse rounded bg-zinc-200" />
      <div className="mt-8 h-32 animate-pulse rounded-lg border border-zinc-200 bg-white" />
      <div className="mt-10 mb-4 flex items-center justify-between">
        <div className="h-6 w-32 animate-pulse rounded bg-zinc-200" />
        <div className="h-8 w-24 animate-pulse rounded bg-zinc-200" />
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

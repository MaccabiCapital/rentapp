export default function Loading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-8 w-40 animate-pulse rounded bg-zinc-200" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-zinc-200" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded bg-zinc-200" />
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse border-b border-zinc-100 bg-zinc-50/30 last:border-b-0"
          />
        ))}
      </div>
    </div>
  )
}

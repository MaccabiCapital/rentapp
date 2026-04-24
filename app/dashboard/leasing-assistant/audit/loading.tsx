export default function Loading() {
  return (
    <div>
      <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
      <div className="mt-3 h-8 w-64 animate-pulse rounded bg-zinc-200" />
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-md border border-zinc-200 bg-zinc-50"
          />
        ))}
      </div>
      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse border-b border-zinc-100 bg-zinc-50/30 last:border-b-0"
          />
        ))}
      </div>
    </div>
  )
}

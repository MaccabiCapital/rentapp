export default function Loading() {
  return (
    <div>
      <div className="mb-6 h-8 w-40 animate-pulse rounded bg-zinc-200" />
      <div className="mb-6 flex gap-2">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded bg-zinc-200" />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse border-b border-zinc-100 bg-zinc-50/30 last:border-b-0"
          />
        ))}
      </div>
    </div>
  )
}

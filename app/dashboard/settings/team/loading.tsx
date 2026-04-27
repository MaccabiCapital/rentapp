export default function Loading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-8 w-32 animate-pulse rounded bg-zinc-200" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-zinc-200" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded bg-zinc-200" />
      </div>
      <div className="mb-8 h-28 animate-pulse rounded-lg border border-zinc-200 bg-white" />
      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="mb-3 h-4 w-32 animate-pulse rounded bg-zinc-200" />
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              {[0, 1].map((j) => (
                <div
                  key={j}
                  className="h-14 animate-pulse border-b border-zinc-100 bg-zinc-50/30 last:border-b-0"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

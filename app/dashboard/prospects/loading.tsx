export default function Loading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded bg-zinc-200" />
        <div className="flex gap-2">
          <div className="h-8 w-32 animate-pulse rounded bg-zinc-200" />
          <div className="h-9 w-32 animate-pulse rounded bg-zinc-200" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-lg border border-zinc-200 bg-zinc-50/40 p-3"
          />
        ))}
      </div>
    </div>
  )
}

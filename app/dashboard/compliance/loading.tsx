export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-8 w-40 animate-pulse rounded bg-zinc-200" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-zinc-200" />
      </div>
      <div className="mb-8 h-24 animate-pulse rounded-md border border-amber-200 bg-amber-50" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-lg border border-zinc-200 bg-white"
          />
        ))}
      </div>
    </div>
  )
}

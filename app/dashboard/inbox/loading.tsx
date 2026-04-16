export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-8 w-40 animate-pulse rounded bg-zinc-200" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-zinc-200" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-white"
          />
        ))}
      </div>
    </div>
  )
}

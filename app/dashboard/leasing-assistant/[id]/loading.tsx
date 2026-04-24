export default function Loading() {
  return (
    <div>
      <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
      <div className="mt-3 h-8 w-96 animate-pulse rounded bg-zinc-200" />
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-md border border-zinc-200 bg-zinc-50"
          />
        ))}
      </div>
    </div>
  )
}

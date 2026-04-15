export default function Loading() {
  return (
    <div>
      <div className="mb-4 h-4 w-40 animate-pulse rounded bg-zinc-200" />
      <div className="mb-2 h-8 w-64 animate-pulse rounded bg-zinc-200" />
      <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-white"
          />
        ))}
      </div>
      <div className="mt-10 h-48 animate-pulse rounded-lg border border-zinc-200 bg-white" />
    </div>
  )
}

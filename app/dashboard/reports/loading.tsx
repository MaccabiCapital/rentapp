export default function Loading() {
  return (
    <div>
      <div className="h-8 w-40 animate-pulse rounded bg-zinc-200" />
      <div className="mt-2 h-4 w-80 animate-pulse rounded bg-zinc-200" />
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-zinc-50"
          />
        ))}
      </div>
    </div>
  )
}

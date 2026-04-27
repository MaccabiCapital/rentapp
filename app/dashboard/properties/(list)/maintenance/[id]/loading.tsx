export default function Loading() {
  return (
    <div>
      <div className="mb-4 h-4 w-40 animate-pulse rounded bg-zinc-200" />
      <div className="mb-2 h-8 w-80 animate-pulse rounded bg-zinc-200" />
      <div className="mt-2 flex gap-2">
        <div className="h-5 w-20 animate-pulse rounded-full bg-zinc-200" />
        <div className="h-5 w-20 animate-pulse rounded-full bg-zinc-200" />
      </div>
      <div className="mt-8 h-24 animate-pulse rounded-lg border border-zinc-200 bg-white" />
      <div className="mt-6 h-48 animate-pulse rounded-lg border border-zinc-200 bg-white" />
    </div>
  )
}

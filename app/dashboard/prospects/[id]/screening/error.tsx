'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-6">
      <h3 className="text-lg font-semibold text-red-900">
        Couldn&rsquo;t load screening
      </h3>
      <p className="mt-1 text-sm text-red-800">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  )
}

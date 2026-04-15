'use client'

export default function ListingsError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h2 className="text-base font-semibold text-red-900">
        Something went wrong loading listings
      </h2>
      <p className="mt-1 text-sm text-red-800">
        Please try again. If the problem persists, reach out to support.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
      >
        Retry
      </button>
    </div>
  )
}

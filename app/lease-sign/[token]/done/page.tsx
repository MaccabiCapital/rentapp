import Link from 'next/link'

export default function LeaseSignDonePage() {
  return (
    <div className="min-h-full bg-zinc-50">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="text-4xl">🎉</div>
          <h1 className="mt-3 text-2xl font-semibold text-emerald-900">
            Lease signed
          </h1>
          <p className="mt-2 text-sm text-emerald-800">
            Your signature has been recorded. The landlord will counter-sign
            and send you the fully-executed copy. You can close this tab.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            Done
          </Link>
        </div>
      </main>
    </div>
  )
}

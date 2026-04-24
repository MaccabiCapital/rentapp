// ============================================================
// Tenant portal landing — tells visitors they need a link
// ============================================================

export default function PortalLanding() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-10 text-center shadow-sm">
      <h1 className="text-xl font-semibold text-zinc-900">
        Welcome to the Rentapp tenant portal
      </h1>
      <p className="mt-3 text-sm text-zinc-600">
        You need a portal link from your landlord to view your lease. Check
        your email or text messages — it will look like{' '}
        <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
          /portal/t/abc123…
        </code>
        .
      </p>
      <p className="mt-3 text-xs text-zinc-500">
        If you can&rsquo;t find it, ask your landlord to send it again.
      </p>
    </div>
  )
}

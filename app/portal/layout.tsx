// ============================================================
// Tenant portal layout
// ============================================================
//
// Separate chrome from the landlord dashboard. No sidebar, no
// inbox, no landlord features. The top bar identifies the app
// as a tenant portal so the visitor knows where they are.

import Link from 'next/link'

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-full bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-slate-900" />
            <span className="text-sm font-semibold text-zinc-900">
              Rentapp
            </span>
            <span className="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-800">
              Tenant portal
            </span>
          </Link>
          <span className="text-xs text-zinc-500">
            Secure read-only view
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  )
}

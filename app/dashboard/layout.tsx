import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/get-user'
import { signOut } from '@/app/actions/auth'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: '◆' },
  { href: '/dashboard/properties', label: 'Properties', icon: '▦' },
  { href: '/dashboard/tenants', label: 'Tenants', icon: '◉' },
  { href: '/dashboard/rent', label: 'Rent', icon: '$' },
  { href: '/dashboard/maintenance', label: 'Maintenance', icon: '⚙' },
  { href: '/dashboard/prospects', label: 'Prospects', icon: '→' },
  { href: '/dashboard/renewals', label: 'Renewals', icon: '↻' },
  { href: '/dashboard/financials', label: 'Financials', icon: '∑' },
] as const

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Real auth enforcement happens here — proxy only does optimistic
  // session refresh. Layouts re-verify every request.
  const user = await getUser()
  if (!user) {
    redirect('/sign-in')
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? ''

  return (
    <div className="flex min-h-full flex-1">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
          <div className="h-7 w-7 rounded-md bg-slate-900" />
          <span className="text-base font-semibold tracking-tight">
            Rentapp
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              <span className="w-4 text-center text-slate-400">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="mb-2 truncate text-xs text-slate-500">
            Signed in as
          </div>
          <div className="mb-3 truncate text-sm font-medium text-slate-900">
            {displayName}
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile top bar (simplified; real mobile nav comes in a later sprint) */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 md:hidden">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-slate-900" />
            <span className="text-base font-semibold tracking-tight">
              Rentapp
            </span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-slate-700 hover:text-slate-900"
            >
              Sign out
            </button>
          </form>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}

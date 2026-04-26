import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/get-user'
import { signOut } from '@/app/actions/auth'
import { getTriageCount } from '@/app/lib/queries/communications'

type NavItem = {
  href: string
  label: string
  icon: string
  badge?: 'inbox'
}

type NavGroup = {
  heading?: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', label: 'Overview', icon: '◆' },
      { href: '/dashboard/inbox', label: 'Inbox', icon: '✉', badge: 'inbox' },
      { href: '/dashboard/workflows', label: 'Workflows', icon: '⟶' },
    ],
  },
  {
    heading: 'Units',
    items: [
      { href: '/dashboard/properties', label: 'Properties', icon: '▦' },
      { href: '/dashboard/listings', label: 'Listings', icon: '◎' },
      { href: '/dashboard/inspections', label: 'Inspections', icon: '☐' },
      { href: '/dashboard/maintenance', label: 'Maintenance', icon: '⚙' },
      { href: '/dashboard/insurance', label: 'Insurance', icon: '✚' },
    ],
  },
  {
    heading: 'Tenants',
    items: [
      { href: '/dashboard/tenants', label: 'Tenants', icon: '◉' },
      { href: '/dashboard/prospects', label: 'Prospects', icon: '→' },
      {
        href: '/dashboard/leasing-assistant',
        label: 'Leasing assistant',
        icon: '✦',
      },
      { href: '/dashboard/rent', label: 'Rent', icon: '$' },
      { href: '/dashboard/late-fees', label: 'Late fees', icon: '⏱' },
      { href: '/dashboard/renewals', label: 'Renewals', icon: '↻' },
      {
        href: '/dashboard/renters-insurance',
        label: 'Renters insurance',
        icon: '◐',
      },
      { href: '/dashboard/notices', label: 'Notices', icon: '⚖' },
      {
        href: '/dashboard/security-deposits',
        label: 'Security deposits',
        icon: '◈',
      },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { href: '/dashboard/reports', label: 'Reports', icon: '📊' },
      { href: '/dashboard/financials', label: 'Financials', icon: '∑' },
      { href: '/dashboard/team', label: 'My Team', icon: '◈' },
      { href: '/dashboard/compliance', label: 'Compliance', icon: '§' },
      { href: '/dashboard/settings', label: 'Settings', icon: '⚐' },
    ],
  },
]

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

  // Triage inbox badge — total unassigned inbound messages. Cheap
  // count query, runs on every dashboard page render.
  let inboxCount = 0
  try {
    inboxCount = await getTriageCount()
  } catch {
    // If the communications table isn't migrated yet (fresh deploy),
    // silently show 0 instead of breaking the whole dashboard.
    inboxCount = 0
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? ''

  function renderNavGroups(linkClass: string) {
    return NAV_GROUPS.map((group, gi) => (
      <div key={gi} className={gi === 0 ? '' : 'pt-4'}>
        {group.heading && (
          <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {group.heading}
          </div>
        )}
        <div className="space-y-1">
          {group.items.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              <span className="w-4 text-center text-slate-400">
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge === 'inbox' && inboxCount > 0 && (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                  {inboxCount > 99 ? '99+' : inboxCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    ))
  }

  const navLinkClass =
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900'

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
        <nav className="flex-1 overflow-y-auto p-4">
          {renderNavGroups(navLinkClass)}
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
        {/* Mobile top bar with a details-based nav drawer. No client
            JS required — the summary/details browser primitive opens
            the menu. */}
        <header className="md:hidden">
          <details className="group border-b border-slate-200 bg-white">
            <summary className="flex h-16 cursor-pointer list-none items-center justify-between px-6 [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white transition-transform group-open:rotate-90">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                    />
                  </svg>
                </span>
                <span className="text-base font-semibold tracking-tight">
                  Rentapp
                </span>
                {inboxCount > 0 && (
                  <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                    {inboxCount > 99 ? '99+' : inboxCount}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500">{displayName}</span>
            </summary>
            <nav className="border-t border-slate-200 p-4">
              {renderNavGroups(navLinkClass)}
              <form action={signOut} className="pt-4">
                <button
                  type="submit"
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  Sign out
                </button>
              </form>
            </nav>
          </details>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}

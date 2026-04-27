// ============================================================
// Section tabs — reusable horizontal nav for entity sub-views
// ============================================================
//
// Used on parent pages (Rent, Tenants, Properties, Settings) to
// expose entity-related sub-pages without cluttering the sidebar.
// Pure server component, no JS — relies on Next.js Link + a
// matched-pathname check via the page passing in `current`.

import Link from 'next/link'

export type SectionTab = {
  href: string
  label: string
  // Optional badge (count, etc.) shown to the right of the label.
  badge?: string | number | null
}

export function SectionTabs({
  tabs,
  current,
}: {
  tabs: SectionTab[]
  current: string
}) {
  return (
    <nav className="-mb-px flex flex-wrap gap-x-6 gap-y-1 border-b border-zinc-200">
      {tabs.map((tab) => {
        const isActive = current === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              'flex items-center gap-1.5 border-b-2 px-1 py-2 text-sm font-medium transition-colors ' +
              (isActive
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-900')
            }
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge !== null && (
              <span
                className={
                  'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ' +
                  (isActive
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-zinc-100 text-zinc-600')
                }
              >
                {tab.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

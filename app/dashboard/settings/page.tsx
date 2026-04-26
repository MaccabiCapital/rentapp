// ============================================================
// Dashboard → Settings → index
// ============================================================
//
// Shell page that lists every settings surface. Today it's just
// SMS; future sprints add notifications, billing, team, etc.

import Link from 'next/link'

const SETTINGS_ITEMS = [
  {
    href: '/dashboard/settings/company',
    title: 'Company',
    description:
      'Business name + logo + mailing address + default policies. Used on every generated document.',
    icon: '◉',
  },
  {
    href: '/dashboard/settings/sms',
    title: 'SMS support line',
    description:
      'Set up a tenant support number. Inbound texts get AI-handled and auto-create maintenance requests.',
    icon: '✉',
  },
] as const

export default function SettingsIndexPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Settings</h1>
      <p className="mb-6 text-sm text-zinc-600">
        Configure how Rentapp connects to tenants and outside services.
      </p>
      <ul className="space-y-3">
        {SETTINGS_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-indigo-300"
            >
              <span
                className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-zinc-100 text-lg text-zinc-700"
                aria-hidden
              >
                {item.icon}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-900">
                  {item.title}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  {item.description}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

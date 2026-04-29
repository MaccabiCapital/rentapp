// ============================================================
// Settings layout — tabs for account/team/etc.
// ============================================================

import { headers } from 'next/headers'
import { SectionTabs } from '@/app/ui/section-tabs'

const TABS = [
  { href: '/dashboard/settings', label: 'Account' },
  { href: '/dashboard/settings/company', label: 'Company' },
  { href: '/dashboard/settings/team', label: 'Team' },
  { href: '/dashboard/settings/sms', label: 'SMS' },
  { href: '/dashboard/settings/api', label: 'API' },
]

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const hdrs = await headers()
  const path =
    hdrs.get('next-url') ??
    hdrs.get('x-invoke-path') ??
    '/dashboard/settings'
  const current =
    [...TABS]
      .sort((a, b) => b.href.length - a.href.length)
      .find((t) => path === t.href || path.startsWith(t.href + '/'))?.href ??
    '/dashboard/settings'

  return (
    <div>
      <SectionTabs tabs={TABS} current={current} />
      <div className="mt-6">{children}</div>
    </div>
  )
}

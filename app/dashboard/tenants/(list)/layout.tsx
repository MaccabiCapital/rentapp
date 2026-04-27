// ============================================================
// Tenants layout — tabs across tenant-lifecycle sub-views
// ============================================================
//
// Route-grouped under (list) so tenant detail pages at
// /dashboard/tenants/[id] are NOT wrapped by these tabs.

import { headers } from 'next/headers'
import { SectionTabs } from '@/app/ui/section-tabs'

const TABS = [
  { href: '/dashboard/tenants', label: 'All tenants' },
  { href: '/dashboard/tenants/renewals', label: 'Renewals' },
  { href: '/dashboard/tenants/notices', label: 'Notices' },
  { href: '/dashboard/tenants/security-deposits', label: 'Security deposits' },
  {
    href: '/dashboard/tenants/renters-insurance',
    label: 'Renters insurance',
  },
]

export default async function TenantsListLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const hdrs = await headers()
  const path =
    hdrs.get('next-url') ?? hdrs.get('x-invoke-path') ?? '/dashboard/tenants'
  const current =
    [...TABS]
      .sort((a, b) => b.href.length - a.href.length)
      .find((t) => path === t.href || path.startsWith(t.href + '/'))?.href ??
    '/dashboard/tenants'

  return (
    <div>
      <SectionTabs tabs={TABS} current={current} />
      <div className="mt-6">{children}</div>
    </div>
  )
}

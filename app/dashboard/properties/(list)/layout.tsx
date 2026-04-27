// ============================================================
// Properties layout — tabs across property-care sub-views
// ============================================================
//
// Route-grouped under (list) so property detail pages at
// /dashboard/properties/[id] are NOT wrapped by these tabs.

import { headers } from 'next/headers'
import { SectionTabs } from '@/app/ui/section-tabs'

const TABS = [
  { href: '/dashboard/properties', label: 'All properties' },
  { href: '/dashboard/properties/inspections', label: 'Inspections' },
  { href: '/dashboard/properties/maintenance', label: 'Maintenance' },
  { href: '/dashboard/properties/insurance', label: 'Insurance' },
]

export default async function PropertiesListLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const hdrs = await headers()
  const path =
    hdrs.get('next-url') ??
    hdrs.get('x-invoke-path') ??
    '/dashboard/properties'
  const current =
    [...TABS]
      .sort((a, b) => b.href.length - a.href.length)
      .find((t) => path === t.href || path.startsWith(t.href + '/'))?.href ??
    '/dashboard/properties'

  return (
    <div>
      <SectionTabs tabs={TABS} current={current} />
      <div className="mt-6">{children}</div>
    </div>
  )
}

// ============================================================
// Rent layout — tabs across the rent collection sub-views
// ============================================================

import { headers } from 'next/headers'
import { SectionTabs } from '@/app/ui/section-tabs'

const TABS = [
  { href: '/dashboard/rent', label: 'Schedule' },
  { href: '/dashboard/rent/late-fees', label: 'Late fees' },
]

export default async function RentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const hdrs = await headers()
  const path =
    hdrs.get('next-url') ?? hdrs.get('x-invoke-path') ?? '/dashboard/rent'
  // Pick the deepest matching tab so /rent/late-fees is "active",
  // not /rent (which is a prefix of every rent path).
  const current =
    [...TABS]
      .sort((a, b) => b.href.length - a.href.length)
      .find((t) => path === t.href || path.startsWith(t.href + '/'))?.href ??
    '/dashboard/rent'

  return (
    <div>
      <SectionTabs tabs={TABS} current={current} />
      <div className="mt-6">{children}</div>
    </div>
  )
}

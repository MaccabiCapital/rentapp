// ============================================================
// Notice PDF download route
// ============================================================
//
// GET /dashboard/tenants/notices/[id]/pdf
//
// Returns a rendered PDF of the notice. Validates the data
// against its per-type Zod schema at render time so stale /
// malformed rows can't produce garbage PDFs.

import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServerClient } from '@/lib/supabase/server'
import { getNotice } from '@/app/lib/queries/notices'
import { getStateRule } from '@/app/lib/queries/state-rules'
import { getMyCompanyProfile } from '@/app/lib/queries/company-profile'
import { getSignedLogoUrl } from '@/app/lib/storage/landlord-branding'
import { parseNoticeData } from '@/app/lib/schemas/notice'
import { NoticePdf } from '@/app/ui/notice-pdf'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const notice = await getNotice(id)
  if (!notice) {
    return new NextResponse('Notice not found', { status: 404 })
  }

  // Parse + validate the stored data against its per-type schema
  let parsedData: unknown
  try {
    parsedData = parseNoticeData(notice.type, notice.data)
  } catch {
    return new NextResponse('Notice data is invalid', { status: 500 })
  }

  const tenantName = notice.lease?.tenant
    ? `${notice.lease.tenant.first_name} ${notice.lease.tenant.last_name}`.trim()
    : 'Tenant'

  const profile = await getMyCompanyProfile()
  const displayName =
    profile?.company_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    'Landlord'

  const landlordAddressLines: string[] = []
  if (profile?.business_street_address) {
    landlordAddressLines.push(
      profile.business_unit
        ? `${profile.business_street_address}, ${profile.business_unit}`
        : profile.business_street_address,
    )
  }
  const cityLine = [
    profile?.business_city,
    profile?.business_state,
    profile?.business_postal_code,
  ]
    .filter(Boolean)
    .join(', ')
  if (cityLine) landlordAddressLines.push(cityLine)

  const contactLine =
    [profile?.business_email, profile?.business_phone]
      .filter(Boolean)
      .join(' · ') || null

  const logoUrl = profile?.logo_storage_path
    ? await getSignedLogoUrl(profile.logo_storage_path, 60)
    : null

  const property = {
    name: notice.lease?.unit?.property?.name ?? 'Property',
    street_address: notice.lease?.unit?.property?.street_address ?? null,
    unit_label: notice.lease?.unit?.unit_number ?? null,
    city: notice.lease?.unit?.property?.city ?? null,
    state: notice.lease?.unit?.property?.state ?? null,
    postal_code: notice.lease?.unit?.property?.postal_code ?? null,
  }

  // Pull state-specific rules for the footer reference
  const stateRule = property.state ? await getStateRule(property.state) : null
  const stateRules = stateRule
    ? {
        increase_notice_days: stateRule.increase_notice_days,
        no_cause_termination_notice_days:
          stateRule.no_cause_termination_notice_days,
        eviction_cure_period_days: stateRule.eviction_cure_period_days,
        late_fee_grace_days_min: stateRule.late_fee_grace_days_min,
      }
    : null

  const pdf = await renderToBuffer(
    <NoticePdf
      type={notice.type}
      data={parsedData}
      generatedOn={notice.generated_at.slice(0, 10)}
      noticeIdShort={notice.id.slice(0, 8)}
      landlord={{
        name: displayName,
        address_lines: landlordAddressLines,
        contact_line: contactLine,
        logoUrl,
      }}
      tenant={{ name: tenantName }}
      property={property}
      stateRules={stateRules}
    />,
  )

  const filename = `notice-${notice.type}-${tenantName}.pdf`
    .replace(/[^a-zA-Z0-9.\-_]/g, '-')
    .toLowerCase()

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

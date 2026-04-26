// ============================================================
// Settlement PDF download route
// ============================================================
//
// GET /dashboard/security-deposits/[id]/pdf
//
// Returns a rendered itemized deposit accounting letter.

import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServerClient } from '@/lib/supabase/server'
import { getSettlement } from '@/app/lib/queries/security-deposits'
import { getMyCompanyProfile } from '@/app/lib/queries/company-profile'
import { SettlementPdf } from '@/app/ui/settlement-pdf'

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

  const settlement = await getSettlement(id)
  if (!settlement) {
    return new NextResponse('Settlement not found', { status: 404 })
  }

  const tenantName = settlement.lease?.tenant
    ? `${settlement.lease.tenant.first_name} ${settlement.lease.tenant.last_name}`.trim()
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

  const property = {
    name: settlement.lease?.unit?.property?.name ?? 'Property',
    street_address: settlement.lease?.unit?.property?.street_address ?? null,
    unit_label: settlement.lease?.unit?.unit_number ?? null,
    city: settlement.lease?.unit?.property?.city ?? null,
    state: settlement.lease?.unit?.property?.state ?? null,
    postal_code: settlement.lease?.unit?.property?.postal_code ?? null,
  }

  const generatedOn = (settlement.finalized_at ?? settlement.created_at).slice(
    0,
    10,
  )

  const pdf = await renderToBuffer(
    <SettlementPdf
      status={settlement.status}
      generatedOn={generatedOn}
      settlementIdShort={settlement.id.slice(0, 8)}
      landlord={{
        name: displayName,
        address_lines: landlordAddressLines,
        contact_line: contactLine,
      }}
      tenant={{
        name: tenantName,
        forwarding_street_address: settlement.forwarding_street_address,
        forwarding_unit: settlement.forwarding_unit,
        forwarding_city: settlement.forwarding_city,
        forwarding_state: settlement.forwarding_state,
        forwarding_postal_code: settlement.forwarding_postal_code,
      }}
      property={property}
      lease={
        settlement.lease
          ? {
              start_date: settlement.lease.start_date,
              end_date: settlement.lease.end_date,
            }
          : null
      }
      originalDeposit={settlement.original_deposit}
      totalDeductions={settlement.totalDeductions}
      net={settlement.net}
      items={settlement.items}
      legalDeadlineDate={settlement.legal_deadline_date}
      stateReturnDays={settlement.state_return_days}
      mailMethod={settlement.mail_method}
    />,
  )

  const filename = `deposit-accounting-${tenantName}.pdf`
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

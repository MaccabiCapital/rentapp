// ============================================================
// Late-fee receipt PDF download
// ============================================================
//
// GET /dashboard/late-fees/[id]/pdf
// Only available when the charge is in 'paid' status.

import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServerClient } from '@/lib/supabase/server'
import { getMyCompanyProfile } from '@/app/lib/queries/company-profile'
import { getSignedLogoUrl } from '@/app/lib/storage/landlord-branding'
import { LateFeeReceiptPdf } from '@/app/ui/late-fee-receipt-pdf'

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

  const { data: charge, error } = await supabase
    .from('late_fee_charges')
    .select(
      `id, amount, status, source, applied_on, paid_at, notes,
       lease:leases (
         monthly_rent,
         tenant:tenants ( first_name, last_name ),
         unit:units ( unit_number, property:properties ( name ) )
       ),
       rent_schedule:rent_schedules ( due_date )`,
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !charge) {
    return new NextResponse('Late fee not found', { status: 404 })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = charge as any
  if (c.status !== 'paid' || !c.paid_at) {
    return new NextResponse(
      'Receipt only available for paid late fees.',
      { status: 400 },
    )
  }

  const tenantName = c.lease?.tenant
    ? `${c.lease.tenant.first_name} ${c.lease.tenant.last_name}`.trim()
    : 'Tenant'

  const profile = await getMyCompanyProfile()
  const landlordName =
    profile?.company_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    'Landlord'

  const addressLines: string[] = []
  if (profile?.business_street_address) {
    addressLines.push(
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
  if (cityLine) addressLines.push(cityLine)
  const contactLine =
    [profile?.business_email, profile?.business_phone]
      .filter(Boolean)
      .join(' · ') || null

  const logoUrl = profile?.logo_storage_path
    ? await getSignedLogoUrl(profile.logo_storage_path, 60)
    : null

  const pdf = await renderToBuffer(
    <LateFeeReceiptPdf
      receiptIdShort={c.id.slice(0, 8)}
      paidOn={(c.paid_at as string).slice(0, 10)}
      amount={Number(c.amount)}
      rentScheduleDueDate={c.rent_schedule?.due_date ?? null}
      rentMonthlyRent={
        c.lease?.monthly_rent !== undefined ? Number(c.lease.monthly_rent) : null
      }
      notes={c.notes ?? null}
      source={c.source}
      tenant={{ name: tenantName }}
      property={{
        name: c.lease?.unit?.property?.name ?? 'Property',
        unit_label: c.lease?.unit?.unit_number ?? null,
      }}
      landlord={{
        name: landlordName,
        address_lines: addressLines,
        contact_line: contactLine,
        logoUrl,
      }}
    />,
  )

  const filename = `late-fee-receipt-${tenantName}-${c.applied_on}.pdf`
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

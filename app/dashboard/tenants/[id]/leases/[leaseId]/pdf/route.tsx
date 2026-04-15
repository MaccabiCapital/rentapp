// ============================================================
// Lease PDF download route
// ============================================================
//
// Hits /dashboard/tenants/[id]/leases/[leaseId]/pdf from a
// signed-in browser and returns the lease summary PDF as a
// direct download. Uses @react-pdf/renderer to render the
// LeasePdf component to a Node Buffer.

import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServerClient } from '@/lib/supabase/server'
import { getLeaseWithRelations } from '@/app/lib/queries/leases'
import { LeasePdf } from '@/app/ui/lease-pdf'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; leaseId: string }> },
) {
  const { id: tenantId, leaseId } = await params

  // Auth gate — RLS inside the query handles isolation but we
  // want a 401 for signed-out users, not an empty 404.
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const lease = await getLeaseWithRelations(leaseId)
  if (!lease || lease.tenant.id !== tenantId) {
    return new NextResponse('Lease not found', { status: 404 })
  }

  // Fetch the property separately — getLeaseWithRelations returns
  // a nested unit.property slice but we need the full Property
  // row for the PDF.
  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', lease.unit.property_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!property) {
    return new NextResponse('Property not found', { status: 404 })
  }

  const pdf = await renderToBuffer(
    <LeasePdf
      lease={lease}
      tenant={lease.tenant}
      unit={lease.unit}
      property={property}
      generatedOn={new Date().toISOString().slice(0, 10)}
    />,
  )

  const filename = `lease-${lease.tenant.last_name}-${lease.start_date}.pdf`
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

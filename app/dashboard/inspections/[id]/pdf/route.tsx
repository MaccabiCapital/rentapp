// ============================================================
// Inspection PDF download route
// ============================================================
//
// GET /dashboard/inspections/[id]/pdf
//
// Returns a rendered PDF of the inspection with photos embedded.
// Auth is enforced via the Supabase RLS query — unsigned users
// get 401; a user viewing someone else's inspection gets 404.

import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServerClient } from '@/lib/supabase/server'
import { getInspection } from '@/app/lib/queries/inspections'
import { resolvePhotoUrls } from '@/app/lib/storage/photos'
import { InspectionPdf } from '@/app/ui/inspection-pdf'

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

  const result = await getInspection(id)
  if (!result) {
    return new NextResponse('Inspection not found', { status: 404 })
  }

  const { inspection, items } = result

  const tenantName = inspection.lease?.tenant
    ? `${inspection.lease.tenant.first_name} ${inspection.lease.tenant.last_name}`.trim()
    : 'Unknown tenant'
  const unitLabel = inspection.lease?.unit?.unit_number ?? 'Unit'
  const propertyName =
    inspection.lease?.unit?.property?.name ?? 'Unknown property'
  const leaseStart = inspection.lease?.start_date ?? ''
  const leaseEnd = inspection.lease?.end_date ?? ''

  // Pre-resolve photo signed URLs so React-PDF can fetch them
  // without hitting RLS middleware.
  const allPhotoPaths = items.flatMap((i) => i.photos)
  const photoUrls = await resolvePhotoUrls(allPhotoPaths)

  const pdf = await renderToBuffer(
    <InspectionPdf
      inspection={inspection}
      items={items}
      context={{
        propertyName,
        unitLabel,
        tenantName,
        leaseStart,
        leaseEnd,
      }}
      photoUrls={photoUrls}
      generatedOn={new Date().toISOString().slice(0, 10)}
    />,
  )

  const filename = `inspection-${inspection.type}-${propertyName}-${unitLabel}.pdf`
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

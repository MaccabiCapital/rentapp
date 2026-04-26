// ============================================================
// Criteria PDF download
// ============================================================
//
// GET /dashboard/compliance/criteria/[id]/pdf
//
// Streams the stored PDF bytes from compliance-documents bucket.
// 401 if no auth, 404 if criteria not found or PDF not yet
// generated (publish or regenerate first).

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCriteria } from '@/app/lib/queries/compliance'
import { downloadCriteriaPdfBytes } from '@/app/lib/storage/compliance-documents'

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

  const criteria = await getCriteria(id)
  if (!criteria) {
    return new NextResponse('Criteria not found', { status: 404 })
  }
  if (!criteria.pdf_storage_path) {
    return new NextResponse(
      'PDF not yet generated. Publish or regenerate first.',
      { status: 404 },
    )
  }

  const bytes = await downloadCriteriaPdfBytes(criteria.pdf_storage_path)
  if (!bytes) {
    return new NextResponse('PDF unavailable', { status: 500 })
  }

  const filename = `tenant-selection-criteria-${criteria.name}.pdf`
    .replace(/[^a-zA-Z0-9.\-_]/g, '-')
    .toLowerCase()

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

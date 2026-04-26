// ============================================================
// Compliance document storage helpers
// ============================================================
//
// Bucket: 'compliance-documents' (private). Path scheme:
//   {ownerId}/criteria/{criteriaId}/v{version}.pdf
//
// Used for tenant selection criteria PDFs (one per version,
// immutable). Future: question audit reports, criteria-vs-listing
// attachment proofs.

import { createServerClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role'

export const COMPLIANCE_DOCUMENTS_BUCKET = 'compliance-documents'

export type ComplianceUploadResult =
  | { success: true; storagePath: string; byteSize: number }
  | { success: false; reason: string }

// ------------------------------------------------------------
// Upload (landlord context — uses authenticated session client)
// ------------------------------------------------------------

export async function uploadCriteriaPdf(opts: {
  ownerId: string
  criteriaId: string
  version: number
  pdfBytes: Uint8Array
}): Promise<ComplianceUploadResult> {
  const supabase = await createServerClient()
  const storagePath = `${opts.ownerId}/criteria/${opts.criteriaId}/v${opts.version}.pdf`

  const { error } = await supabase.storage
    .from(COMPLIANCE_DOCUMENTS_BUCKET)
    .upload(storagePath, opts.pdfBytes, {
      contentType: 'application/pdf',
      upsert: true, // versioning is in the filename, but allow overwrite
    })

  if (error) {
    return { success: false, reason: error.message }
  }

  return {
    success: true,
    storagePath,
    byteSize: opts.pdfBytes.byteLength,
  }
}

// ------------------------------------------------------------
// Download for the PDF route
// ------------------------------------------------------------

export async function downloadCriteriaPdfBytes(
  storagePath: string,
): Promise<Uint8Array | null> {
  const supabase = getServiceRoleClient()
  const { data, error } = await supabase.storage
    .from(COMPLIANCE_DOCUMENTS_BUCKET)
    .download(storagePath)
  if (error || !data) return null
  const ab = await data.arrayBuffer()
  return new Uint8Array(ab)
}

export async function getSignedUrlForCriteriaPdf(
  storagePath: string,
  expiresInSeconds = 300,
): Promise<string | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.storage
    .from(COMPLIANCE_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)
  if (error || !data) return null
  return data.signedUrl
}

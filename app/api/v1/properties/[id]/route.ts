// ============================================================
// GET /api/v1/properties/:id
// ============================================================

import {
  authenticateApiRequest,
  jsonError,
  jsonOk,
} from '@/app/lib/api/auth'
import { getServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApiRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const supabase = getServiceRoleClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*, units(*)')
    .eq('id', id)
    .eq('owner_id', auth.ownerId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) return jsonError(500, error.message)
  if (!data) return jsonError(404, 'Property not found')

  return jsonOk({ data })
}

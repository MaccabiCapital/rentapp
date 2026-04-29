// ============================================================
// GET /api/v1/listings
// ============================================================

import {
  authenticateApiRequest,
  jsonError,
  jsonOk,
  parsePageOpts,
} from '@/app/lib/api/auth'
import { getServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request)
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const { limit, cursor } = parsePageOpts(url)

  const supabase = getServiceRoleClient()
  let query = supabase
    .from('listings')
    .select(
      'id, slug, title, description, headline_rent, available_on, contact_email, contact_phone, is_active, view_count, inquiry_count, created_at, updated_at',
    )
    .eq('owner_id', auth.ownerId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (cursor) query = query.lt('created_at', cursor)

  const { data, error } = await query
  if (error) return jsonError(500, error.message)

  const rows = data ?? []
  const hasMore = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, limit) : rows
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextCursor = hasMore ? (pageRows[pageRows.length - 1] as any).created_at : null

  return jsonOk({ data: pageRows, pagination: { next_cursor: nextCursor, limit } })
}

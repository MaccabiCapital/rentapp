// ============================================================
// Inspection comparison — pairs move_in against move_out
// ============================================================
//
// For a given "focus" inspection of type move_in or move_out,
// find the matching opposite-type inspection on the same lease
// and return a row-by-row diff joined by (room, item) name.
//
// Pairing rule: pick the newest opposite-type inspection on the
// same lease that is signed OR completed. If there's no signed/
// completed opposite, fall back to the newest in_progress/draft
// so you can still see partial data. Soft-deleted excluded.

import { createServerClient } from '@/lib/supabase/server'
import type {
  Inspection,
  InspectionItem,
  InspectionType,
  ItemCondition,
} from '@/app/lib/schemas/inspection'

// Rank higher = worse. Used to compute the delta between an
// inspection pair. "Not rated" (null) is treated as unknown and
// doesn't participate in the worse/better calculation.
const CONDITION_RANK: Record<ItemCondition, number> = {
  excellent: 0,
  good: 1,
  fair: 2,
  poor: 3,
  damaged: 4,
}

export type DiffStatus =
  | 'worse'          // move-out worse than move-in
  | 'same'           // identical condition ratings
  | 'better'         // condition improved (repair happened mid-lease)
  | 'new_damage'     // move-out rated damaged and move-in was not rated or unrated
  | 'only_in_move_in'
  | 'only_in_move_out'
  | 'unrated'        // neither side rated

export type DiffRow = {
  room: string
  item: string
  status: DiffStatus
  move_in_condition: ItemCondition | null
  move_out_condition: ItemCondition | null
  move_in_notes: string | null
  move_out_notes: string | null
  move_in_photos: string[]
  move_out_photos: string[]
  move_in_item_id: string | null
  move_out_item_id: string | null
  delta: number // positive = worse, 0 = same, negative = better, NaN = unknown
}

export type InspectionPair = {
  focus: Inspection
  other: Inspection | null
  moveIn: (Inspection & { items: InspectionItem[] }) | null
  moveOut: (Inspection & { items: InspectionItem[] }) | null
  rows: DiffRow[]
  summary: {
    total: number
    worse: number
    newDamage: number
    same: number
    better: number
    onlyInMoveIn: number
    onlyInMoveOut: number
    unrated: number
  }
}

function normalizeKey(room: string, item: string): string {
  return `${room.trim().toLowerCase()}::${item.trim().toLowerCase()}`
}

function statusFor(
  moveInCond: ItemCondition | null,
  moveOutCond: ItemCondition | null,
  presentInBoth: boolean,
  side: 'move_in_only' | 'move_out_only' | 'both',
): { status: DiffStatus; delta: number } {
  if (side === 'move_in_only') {
    return { status: 'only_in_move_in', delta: Number.NaN }
  }
  if (side === 'move_out_only') {
    return { status: 'only_in_move_out', delta: Number.NaN }
  }
  // Both sides present
  if (!presentInBoth) {
    return { status: 'unrated', delta: Number.NaN }
  }
  if (moveInCond === null && moveOutCond === null) {
    return { status: 'unrated', delta: Number.NaN }
  }
  // If move-out is damaged and move-in wasn't rated, still flag as
  // new damage — landlord's best guess is "the damage showed up
  // because we didn't see it at move-in."
  if (moveInCond === null && moveOutCond === 'damaged') {
    return { status: 'new_damage', delta: 99 }
  }
  if (moveInCond === null || moveOutCond === null) {
    return { status: 'unrated', delta: Number.NaN }
  }
  const delta = CONDITION_RANK[moveOutCond] - CONDITION_RANK[moveInCond]
  if (delta > 0) {
    // If move-in was excellent/good and move-out is damaged, flag
    // as new damage for stronger visual signal.
    if (
      moveOutCond === 'damaged' &&
      (moveInCond === 'excellent' || moveInCond === 'good')
    ) {
      return { status: 'new_damage', delta }
    }
    return { status: 'worse', delta }
  }
  if (delta < 0) return { status: 'better', delta }
  return { status: 'same', delta: 0 }
}

async function loadInspectionWithItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  id: string,
): Promise<(Inspection & { items: InspectionItem[] }) | null> {
  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error || !data) return null
  const { data: items, error: iErr } = await supabase
    .from('inspection_items')
    .select('*')
    .eq('inspection_id', id)
    .order('sort_order', { ascending: true })
  if (iErr) return null
  return { ...(data as Inspection), items: (items ?? []) as InspectionItem[] }
}

async function findMatchingOpposite(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  leaseId: string,
  focusType: InspectionType,
  focusId: string,
): Promise<Inspection | null> {
  if (focusType === 'periodic') return null
  const oppositeType: InspectionType =
    focusType === 'move_in' ? 'move_out' : 'move_in'

  // Try signed / completed first
  const { data: ready, error: rErr } = await supabase
    .from('inspections')
    .select('*')
    .eq('lease_id', leaseId)
    .eq('type', oppositeType)
    .neq('id', focusId)
    .is('deleted_at', null)
    .in('status', ['signed', 'completed'])
    .order('completed_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
  if (!rErr && ready && ready.length > 0) {
    return ready[0] as Inspection
  }

  // Fall back to any non-deleted opposite
  const { data: any_, error: aErr } = await supabase
    .from('inspections')
    .select('*')
    .eq('lease_id', leaseId)
    .eq('type', oppositeType)
    .neq('id', focusId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
  if (aErr || !any_ || any_.length === 0) return null
  return any_[0] as Inspection
}

// Lightweight check — used on the detail page to decide whether
// to show the "Compare" button without loading all the items.
export async function hasMatchingOppositeInspection(
  leaseId: string,
  focusType: InspectionType,
  focusId: string,
): Promise<boolean> {
  if (focusType === 'periodic') return false
  const supabase = await createServerClient()
  const match = await findMatchingOpposite(
    supabase,
    leaseId,
    focusType,
    focusId,
  )
  return match !== null
}

export async function getInspectionPair(
  focusId: string,
): Promise<InspectionPair | null> {
  const supabase = await createServerClient()
  const focus = await loadInspectionWithItems(supabase, focusId)
  if (!focus) return null
  if (focus.type === 'periodic') {
    return {
      focus,
      other: null,
      moveIn: null,
      moveOut: null,
      rows: [],
      summary: {
        total: 0,
        worse: 0,
        newDamage: 0,
        same: 0,
        better: 0,
        onlyInMoveIn: 0,
        onlyInMoveOut: 0,
        unrated: 0,
      },
    }
  }

  const oppositeHeader = await findMatchingOpposite(
    supabase,
    focus.lease_id,
    focus.type,
    focus.id,
  )
  const other = oppositeHeader
    ? await loadInspectionWithItems(supabase, oppositeHeader.id)
    : null

  const moveIn = focus.type === 'move_in' ? focus : other
  const moveOut = focus.type === 'move_out' ? focus : other

  if (!moveIn || !moveOut) {
    return {
      focus,
      other,
      moveIn,
      moveOut,
      rows: [],
      summary: {
        total: 0,
        worse: 0,
        newDamage: 0,
        same: 0,
        better: 0,
        onlyInMoveIn: 0,
        onlyInMoveOut: 0,
        unrated: 0,
      },
    }
  }

  // Index both sides by (room, item) key
  const moveInByKey = new Map<string, InspectionItem>()
  for (const it of moveIn.items) {
    moveInByKey.set(normalizeKey(it.room, it.item), it)
  }
  const moveOutByKey = new Map<string, InspectionItem>()
  for (const it of moveOut.items) {
    moveOutByKey.set(normalizeKey(it.room, it.item), it)
  }

  // Union of keys, in move_in display order first, then any move_out
  // keys that weren't in move_in.
  const orderedKeys: string[] = []
  const seen = new Set<string>()
  for (const it of moveIn.items) {
    const k = normalizeKey(it.room, it.item)
    orderedKeys.push(k)
    seen.add(k)
  }
  for (const it of moveOut.items) {
    const k = normalizeKey(it.room, it.item)
    if (!seen.has(k)) {
      orderedKeys.push(k)
      seen.add(k)
    }
  }

  const rows: DiffRow[] = []
  const summary = {
    total: 0,
    worse: 0,
    newDamage: 0,
    same: 0,
    better: 0,
    onlyInMoveIn: 0,
    onlyInMoveOut: 0,
    unrated: 0,
  }

  for (const k of orderedKeys) {
    const inRow = moveInByKey.get(k) ?? null
    const outRow = moveOutByKey.get(k) ?? null
    const side =
      inRow && outRow
        ? ('both' as const)
        : inRow
          ? ('move_in_only' as const)
          : ('move_out_only' as const)

    const { status, delta } = statusFor(
      inRow?.condition ?? null,
      outRow?.condition ?? null,
      !!inRow && !!outRow,
      side,
    )

    const displayRoom = (inRow?.room ?? outRow?.room ?? '').trim()
    const displayItem = (inRow?.item ?? outRow?.item ?? '').trim()

    rows.push({
      room: displayRoom,
      item: displayItem,
      status,
      move_in_condition: inRow?.condition ?? null,
      move_out_condition: outRow?.condition ?? null,
      move_in_notes: inRow?.notes ?? null,
      move_out_notes: outRow?.notes ?? null,
      move_in_photos: inRow?.photos ?? [],
      move_out_photos: outRow?.photos ?? [],
      move_in_item_id: inRow?.id ?? null,
      move_out_item_id: outRow?.id ?? null,
      delta,
    })

    summary.total += 1
    if (status === 'worse') summary.worse += 1
    else if (status === 'new_damage') summary.newDamage += 1
    else if (status === 'same') summary.same += 1
    else if (status === 'better') summary.better += 1
    else if (status === 'only_in_move_in') summary.onlyInMoveIn += 1
    else if (status === 'only_in_move_out') summary.onlyInMoveOut += 1
    else summary.unrated += 1
  }

  return { focus, other: oppositeHeader, moveIn, moveOut, rows, summary }
}

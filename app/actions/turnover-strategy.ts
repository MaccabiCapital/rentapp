'use server'

// ============================================================
// Turnover-strategy action
// ============================================================
//
// Records the landlord's decision on how to handle turnover
// when a tenant gives notice. Two options:
//
//   list_during_notice — list the unit immediately; show it
//     during the notice period with entry notices to the
//     outgoing tenant. Standard path to minimize vacant days.
//
//   wait_until_vacant — defer listing until after move-out.
//     Used when the unit needs a full refresh (paint, carpet,
//     major work) and wouldn't show well.
//
// A NULL value (default) means undecided and surfaces the
// decision prompt in the offboard workflow.

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import type { ActionState } from '@/app/lib/types'

export const TURNOVER_STRATEGY_VALUES = [
  'list_during_notice',
  'wait_until_vacant',
] as const
export type TurnoverStrategy = (typeof TURNOVER_STRATEGY_VALUES)[number]

export async function setTurnoverStrategy(
  leaseId: string,
  strategy: TurnoverStrategy | null,
): Promise<ActionState> {
  if (
    strategy !== null &&
    !TURNOVER_STRATEGY_VALUES.includes(strategy as TurnoverStrategy)
  ) {
    return { success: false, message: 'Invalid turnover strategy.' }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  const { error } = await supabase
    .from('leases')
    .update({ turnover_strategy: strategy })
    .eq('id', leaseId)
    .eq('owner_id', user.id)

  if (error) {
    return {
      success: false,
      message: `Failed to save decision: ${error.message}`,
    }
  }

  revalidatePath(`/dashboard/workflows/offboard-tenant`)
  revalidatePath(`/dashboard/workflows/offboard-tenant/${leaseId}`)
  return { success: true }
}

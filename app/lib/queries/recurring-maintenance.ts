// ============================================================
// Recurring maintenance read queries
// ============================================================

import { createServerClient } from '@/lib/supabase/server'
import type {
  RecurringMaintenanceTask,
  MaintenanceCompletion,
} from '@/app/lib/schemas/recurring-maintenance'

export type TaskWithContext = RecurringMaintenanceTask & {
  property: { id: string; name: string } | null
  unit: {
    id: string
    unit_number: string | null
    property: { id: string; name: string } | null
  } | null
}

const CONTEXT_SELECT = `
  *,
  property:properties ( id, name ),
  unit:units (
    id, unit_number,
    property:properties ( id, name )
  )
`

export async function listRecurringTasks(opts?: {
  status?: 'active' | 'paused' | 'archived'
}): Promise<TaskWithContext[]> {
  const supabase = await createServerClient()
  let q = supabase
    .from('recurring_maintenance_tasks')
    .select(CONTEXT_SELECT)
    .is('deleted_at', null)
    .order('next_due_date', { ascending: true })

  if (opts?.status) q = q.eq('status', opts.status)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as TaskWithContext[]
}

export async function getRecurringTask(
  id: string,
): Promise<TaskWithContext | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('recurring_maintenance_tasks')
    .select(CONTEXT_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error || !data) return null
  return data as unknown as TaskWithContext
}

export async function listCompletions(
  taskId: string,
): Promise<MaintenanceCompletion[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('recurring_maintenance_completions')
    .select('*')
    .eq('task_id', taskId)
    .order('completed_on', { ascending: false })
  if (error) throw error
  return (data ?? []) as MaintenanceCompletion[]
}

// Used by the dashboard action items panel: how many active tasks
// are within their lead-time window or already overdue.
export async function listDueOrOverdueTasks(): Promise<TaskWithContext[]> {
  const all = await listRecurringTasks({ status: 'active' })
  const today = new Date().toISOString().slice(0, 10)
  return all.filter((t) => {
    const due = t.next_due_date
    // Within lead time, or overdue
    const daysOut = Math.floor(
      (new Date(due + 'T00:00:00Z').getTime() -
        new Date(today + 'T00:00:00Z').getTime()) /
        (1000 * 60 * 60 * 24),
    )
    return daysOut <= t.lead_time_days
  })
}

// For the property + unit detail page hooks
export async function listTasksForProperty(
  propertyId: string,
): Promise<RecurringMaintenanceTask[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('recurring_maintenance_tasks')
    .select('*')
    .eq('property_id', propertyId)
    .is('deleted_at', null)
    .order('next_due_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as RecurringMaintenanceTask[]
}

export async function listTasksForUnit(
  unitId: string,
): Promise<RecurringMaintenanceTask[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('recurring_maintenance_tasks')
    .select('*')
    .eq('unit_id', unitId)
    .is('deleted_at', null)
    .order('next_due_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as RecurringMaintenanceTask[]
}

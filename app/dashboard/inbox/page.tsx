// ============================================================
// Dashboard → Inbox → triage queue
// ============================================================
//
// Inbound SMS messages the Retell pipeline couldn't resolve to a
// known tenant land here. The landlord either assigns the number
// to an existing tenant (which auto-creates an identity row so
// future messages route correctly) or dismisses the message.

import Link from 'next/link'
import { getTriageQueue } from '@/app/lib/queries/communications'
import { getTenantsForPicker } from '@/app/lib/queries/tenants'
import { createServerClient } from '@/lib/supabase/server'
import { formatPhoneForDisplay } from '@/app/lib/phone'
import { TriageItemActions } from '@/app/ui/triage-item-actions'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function InboxPage() {
  const triage = await getTriageQueue()
  const tenants = await getTenantsForPicker()

  // Single query for every active lease's unit label — replaces an
  // N+1 getLeasesForTenant loop. Returns a map from tenant_id to
  // unit_label string.
  const supabase = await createServerClient()
  const unitLabelByTenantId = new Map<string, string>()
  if (tenants.length > 0) {
    const { data: activeLeases } = await supabase
      .from('leases')
      .select(
        'tenant_id, unit:units!inner(unit_number, property:properties!inner(name))',
      )
      .eq('status', 'active')
      .is('deleted_at', null)
      .in(
        'tenant_id',
        tenants.map((t) => t.id),
      )
    for (const row of activeLeases ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = row as any
      const label = r.unit?.property?.name
        ? `${r.unit.property.name}${r.unit.unit_number ? ` · ${r.unit.unit_number}` : ''}`
        : (r.unit?.unit_number ?? '')
      if (r.tenant_id && label) {
        unitLabelByTenantId.set(r.tenant_id, label)
      }
    }
  }

  const tenantOptions = tenants.map((t) => ({
    id: t.id,
    name:
      `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() ||
      t.email ||
      'Tenant',
    unit_label: unitLabelByTenantId.get(t.id) ?? null,
  }))

  if (triage.length === 0) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Inbox</h1>
        <p className="mb-6 text-sm text-zinc-600">
          Inbound messages from phone numbers we couldn&rsquo;t match to a
          known tenant. Assign them to the right tenant — future messages
          from that number will route automatically.
        </p>
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            You&rsquo;re all caught up
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            No unassigned inbound messages.
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/settings/sms"
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              SMS settings →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Inbox</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {triage.length} inbound message{triage.length === 1 ? '' : 's'}{' '}
            awaiting triage.
          </p>
        </div>
        <Link
          href="/dashboard/settings/sms"
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          SMS settings →
        </Link>
      </div>

      <ul className="space-y-4">
        {triage.map((t) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const meta = (t.metadata ?? {}) as any
          const phone = (meta.from_number as string | undefined) ?? null
          return (
            <li
              key={t.id}
              className="rounded-lg border border-amber-200 bg-amber-50/40 p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-sm font-medium text-zinc-900">
                  {phone ? formatPhoneForDisplay(phone) : 'Unknown number'}
                </div>
                <time className="text-xs text-zinc-500" dateTime={t.created_at}>
                  {formatDateTime(t.created_at)}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                {t.content}
              </p>
              {meta.analysis && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {meta.analysis.issue_type && (
                    <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs text-zinc-700">
                      {meta.analysis.issue_type}
                    </span>
                  )}
                  {meta.analysis.severity && (
                    <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs text-zinc-700">
                      severity: {meta.analysis.severity}
                    </span>
                  )}
                </div>
              )}
              <div className="mt-3">
                <TriageItemActions
                  commId={t.id}
                  phoneNumber={phone ?? ''}
                  tenantOptions={tenantOptions}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

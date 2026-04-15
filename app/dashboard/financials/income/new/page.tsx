import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { recordManualPayment } from '@/app/actions/expenses'
import { ManualPaymentForm } from '@/app/ui/manual-payment-form'

type LeaseJoin = {
  id: string
  monthly_rent: number | string | null
  tenant: { first_name: string; last_name: string } | null
  unit:
    | {
        unit_number: string | null
        property: { name: string } | null
      }
    | null
}

async function getActiveLeaseOptions() {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('leases')
    .select(
      'id, monthly_rent, tenant:tenants!inner(first_name, last_name), unit:units!inner(unit_number, property:properties!inner(name))',
    )
    .is('deleted_at', null)
    .in('status', ['active', 'draft'])
    .order('start_date', { ascending: false })

  return (data ?? []).map((rawRow) => {
    const row = rawRow as unknown as LeaseJoin
    const propertyName = row.unit?.property?.name ?? 'Unknown'
    const unitLabel = row.unit?.unit_number ? ` · ${row.unit.unit_number}` : ''
    const tenant = row.tenant
      ? ` · ${row.tenant.first_name} ${row.tenant.last_name}`
      : ''
    return {
      id: row.id,
      label: `${propertyName}${unitLabel}${tenant}`,
      suggested_rent: Number(row.monthly_rent ?? 0),
    }
  })
}

export default async function NewIncomePage() {
  const leaseOptions = await getActiveLeaseOptions()

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/financials"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to financials
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Record rent payment
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Log rent received via Zelle, check, cash, or any non-Stripe method.
          Once Stripe rent collection (Sprint 3) ships, automated payments
          will flow through here too.
        </p>
      </div>
      <ManualPaymentForm action={recordManualPayment} leaseOptions={leaseOptions} />
    </div>
  )
}

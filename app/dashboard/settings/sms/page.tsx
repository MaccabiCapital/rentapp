// ============================================================
// Dashboard → Settings → SMS support line
// ============================================================
//
// Landlords provision a support line here. Today the underlying
// Retell + Twilio calls are stubbed — see docs/SPRINT-13-NEEDS.md
// for what's required before this is production-usable.

import Link from 'next/link'
import { getPhoneLineByType } from '@/app/lib/queries/phone-lines'
import { formatPhoneForDisplay } from '@/app/lib/phone'
import { LINE_STATUS_LABELS } from '@/app/lib/schemas/phone-lines'
import { ProvisionSupportLineButton } from '@/app/ui/provision-support-line-button'

const STATUS_TONE = {
  pending: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  suspended: 'bg-zinc-200 text-zinc-700',
} as const

export default async function SmsSettingsPage() {
  const line = await getPhoneLineByType('support')

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard/settings"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Settings
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">
        SMS support line
      </h1>
      <p className="mb-6 text-sm text-zinc-600">
        Give tenants a number to text for maintenance issues. An AI
        assistant asks clarifying questions, collects photos, and
        auto-creates a maintenance request that lands in your dashboard.
      </p>

      <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p>
          <span className="font-medium">Heads up:</span> the Retell AI +
          Twilio integration is stubbed in this build. Provisioning here
          writes a placeholder row with a fake number. Real numbers require
          a Retell API key, a Twilio account, and A2P 10DLC carrier
          registration (takes hours to weeks).
        </p>
        <p className="mt-2">
          See <code className="rounded bg-amber-100 px-1 py-0.5">docs/SPRINT-13-NEEDS.md</code>{' '}
          for the full activation checklist.
        </p>
      </div>

      {line ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Support number
              </div>
              <div className="mt-1 text-xl font-semibold text-zinc-900">
                {line.twilio_number
                  ? formatPhoneForDisplay(line.twilio_number)
                  : 'Pending…'}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[line.status]}`}
                >
                  {LINE_STATUS_LABELS[line.status]}
                </span>
                {line.retell_agent_id && (
                  <span className="text-xs text-zinc-500">
                    agent {line.retell_agent_id}
                  </span>
                )}
              </div>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailRow
              label="A2P brand"
              value={line.a2p_brand_id ?? 'Not submitted'}
            />
            <DetailRow
              label="A2P campaign"
              value={line.a2p_campaign_id ?? 'Not submitted'}
            />
          </dl>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            No support line yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
            Provisioning reserves a number, creates an AI agent with your
            tenant-support prompt, and wires up webhooks so inbound texts
            land in Rentapp automatically.
          </p>
          <div className="mt-6 flex justify-center">
            <ProvisionSupportLineButton />
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900">{value}</dd>
    </div>
  )
}

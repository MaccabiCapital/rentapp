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
import { ProvisionLeasingLineButton } from '@/app/ui/provision-leasing-line-button'

const STATUS_TONE = {
  pending: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  suspended: 'bg-zinc-200 text-zinc-700',
} as const

export default async function SmsSettingsPage() {
  const [supportLine, leasingLine] = await Promise.all([
    getPhoneLineByType('support'),
    getPhoneLineByType('leasing'),
  ])

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
        Voice + SMS lines
      </h1>
      <p className="mb-6 text-sm text-zinc-600">
        Two separate AI-powered lines: one for existing tenants
        (maintenance + questions) and one for prospects calling about
        listings (viewings + unit questions + application link).
      </p>

      <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p>
          <span className="font-medium">Heads up:</span> the Retell AI +
          Twilio integration is stubbed in this build. Provisioning here
          writes a placeholder row with a fake number. Real numbers need
          a Retell API key and Twilio credentials — carrier registration
          (A2P 10DLC) can wait until you&rsquo;re past testing.
        </p>
        <p className="mt-2">
          See <code className="rounded bg-amber-100 px-1 py-0.5">docs/SPRINT-13-NEEDS.md</code>{' '}
          for the activation checklist.
        </p>
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-600">
        Tenant support line
      </h2>
      <p className="mb-3 text-xs text-zinc-500">
        For existing tenants to text with maintenance issues or questions.
        The AI agent triages, collects photos, auto-creates a maintenance
        request.
      </p>
      {supportLine ? (
        <LineCard line={supportLine} />
      ) : (
        <EmptyLineCard
          title="No tenant support line yet"
          description="Provisioning reserves a number, creates an AI agent with your tenant-support prompt, and wires up webhooks so inbound texts land in Rentapp automatically."
          button={<ProvisionSupportLineButton />}
        />
      )}

      <h2 className="mt-10 mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-600">
        Leasing line (prospect inquiries)
      </h2>
      <p className="mb-3 text-xs text-zinc-500">
        For prospects calling or texting about listings. The AI agent
        answers unit questions, schedules viewings, shares your
        application URL, and auto-creates a prospect record when the call
        ends.
      </p>
      {leasingLine ? (
        <LineCard line={leasingLine} />
      ) : (
        <EmptyLineCard
          title="No leasing line yet"
          description="Provisioning creates a separate AI agent with a prospect-facing system prompt (unit details, viewings, application URL) so you never miss an inquiry."
          button={<ProvisionLeasingLineButton />}
        />
      )}
    </div>
  )
}

function LineCard({
  line,
}: {
  line: {
    twilio_number: string | null
    status: keyof typeof STATUS_TONE
    retell_agent_id: string | null
    a2p_brand_id: string | null
    a2p_campaign_id: string | null
  }
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Phone number
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
  )
}

function EmptyLineCard({
  title,
  description,
  button,
}: {
  title: string
  description: string
  button: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center">
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
        {description}
      </p>
      <div className="mt-4 flex justify-center">{button}</div>
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

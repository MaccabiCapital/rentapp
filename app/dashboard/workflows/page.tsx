// ============================================================
// Dashboard → Workflows index
// ============================================================
//
// Five guided sequences that cross modules. Each card opens
// a coordinator page that walks through the checklist with
// inferred step-completion.

import Link from 'next/link'

type Workflow = {
  slug: string
  title: string
  description: string
  icon: string
  anchor: 'lease' | 'unit'
  tone: 'default' | 'urgent' | 'warning'
}

const WORKFLOWS: Workflow[] = [
  {
    slug: 'first-setup',
    title: 'First-time setup',
    description:
      'Brand new to Rentapp? This wizard walks you through the four things you need to get the whole app working: a property, a unit, a tenant, a lease.',
    icon: '🚀',
    anchor: 'lease',
    tone: 'default',
  },
  {
    slug: 'onboard-tenant',
    title: 'Onboard a tenant',
    description:
      'A tenant just signed a lease. Move-in inspection, renters insurance, welcome notice — all the post-signing tasks in order.',
    icon: '👋',
    anchor: 'lease',
    tone: 'default',
  },
  {
    slug: 'offboard-tenant',
    title: 'Offboard a tenant',
    description:
      'A tenant gave notice or is at lease-end. Move-out inspection, move-in/out comparison, security deposit return, mark unit vacant.',
    icon: '📦',
    anchor: 'lease',
    tone: 'default',
  },
  {
    slug: 'annual-renewal',
    title: 'Annual renewal decision',
    description:
      'A lease expires in 30–90 days. Review terms, decide renew / change rent / non-renew, generate the right notice.',
    icon: '↻',
    anchor: 'lease',
    tone: 'warning',
  },
  {
    slug: 'late-rent',
    title: 'Handle late rent',
    description:
      'Rent is past due. Late notice → grace period → pay-or-quit escalation with state-aware cure periods.',
    icon: '⚠',
    anchor: 'lease',
    tone: 'urgent',
  },
  {
    slug: 'turnover-unit',
    title: 'Turnover a vacant unit',
    description:
      'Unit is empty. Maintenance checklist, create listing, start taking prospects. Every vacant day is lost rent.',
    icon: '🧹',
    anchor: 'unit',
    tone: 'default',
  },
]

const TONE_BORDER: Record<Workflow['tone'], string> = {
  default: 'border-zinc-200',
  warning: 'border-amber-200',
  urgent: 'border-red-200',
}

const TONE_TAG_BG: Record<Workflow['tone'], string> = {
  default: 'bg-zinc-100 text-zinc-700',
  warning: 'bg-amber-100 text-amber-800',
  urgent: 'bg-red-100 text-red-800',
}

const TONE_TAG_LABEL: Record<Workflow['tone'], string> = {
  default: 'Workflow',
  warning: 'Time-sensitive',
  urgent: 'Escalation',
}

export default function WorkflowsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Workflows</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Guided sequences for the most common multi-step landlord tasks. Each
          workflow walks through a checklist and pre-fills fields across the
          app. Pick one to start.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {WORKFLOWS.map((w) => (
          <Link
            key={w.slug}
            href={`/dashboard/workflows/${w.slug}`}
            className={`group block rounded-lg border bg-white p-5 shadow-sm transition hover:border-indigo-400 hover:shadow ${TONE_BORDER[w.tone]}`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl leading-none">{w.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-zinc-900">
                    {w.title}
                  </h2>
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TONE_TAG_BG[w.tone]}`}
                  >
                    {TONE_TAG_LABEL[w.tone]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-600">{w.description}</p>
                <div className="mt-3 text-xs text-indigo-600 group-hover:text-indigo-700">
                  Start workflow →
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

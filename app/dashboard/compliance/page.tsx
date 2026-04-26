// ============================================================
// Dashboard → Compliance
// ============================================================
//
// State-by-state rent rule reference. Highlights states the
// landlord has properties in at the top, then shows all other
// researched states, then unresearched states.

import Link from 'next/link'
import {
  getAllStateRules,
  getStatesInPortfolio,
} from '@/app/lib/queries/state-rules'
import {
  listFindings,
  countOpenFindingsBySeverity,
  getActivePublishedCriteria,
} from '@/app/lib/queries/compliance'
import { ComplianceDisclaimer } from '@/app/ui/compliance-disclaimer'
import { StateRuleCard } from '@/app/ui/state-rule-card'
import { ListingCopyScanner } from '@/app/ui/listing-copy-scanner'
import { ComplianceFindingRow } from '@/app/ui/compliance-finding-row'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function CompliancePage() {
  const [
    allRules,
    portfolioStates,
    openFindings,
    findingsCounts,
    activeCriteria,
  ] = await Promise.all([
    getAllStateRules(),
    getStatesInPortfolio(),
    listFindings({ status: 'open', limit: 50 }),
    countOpenFindingsBySeverity(),
    getActivePublishedCriteria(),
  ])

  const portfolioSet = new Set(portfolioStates)
  const myStatesRules = allRules.filter((r) => portfolioSet.has(r.state))
  const otherResearched = allRules.filter(
    (r) => !portfolioSet.has(r.state) && r.is_researched,
  )
  const unresearched = allRules.filter(
    (r) => !portfolioSet.has(r.state) && !r.is_researched,
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Compliance</h1>
        <p className="mt-1 text-sm text-zinc-600">
          State-by-state reference on rent caps, notice requirements,
          security deposit rules, and eviction procedures.
        </p>
      </div>

      <div className="mb-8">
        <ComplianceDisclaimer />
      </div>

      {/* Active tenant selection criteria — lawsuit-shield artifact */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
          Active tenant selection criteria
        </h2>
        {activeCriteria ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-zinc-900">
                    {activeCriteria.name}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Published
                  </span>
                </div>
                <p className="mt-1 text-sm text-emerald-800">
                  {activeCriteria.jurisdiction} · published{' '}
                  {formatDate(activeCriteria.published_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeCriteria.pdf_storage_path && (
                  <a
                    href={`/dashboard/compliance/criteria/${activeCriteria.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    Download PDF
                  </a>
                )}
                <Link
                  href={`/dashboard/compliance/criteria/${activeCriteria.id}`}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
                >
                  View / edit
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-amber-900">
                  No published criteria yet
                </div>
                <p className="mt-1 text-sm text-amber-800">
                  Required for the fair-housing safe-harbor argument. Create
                  your tenant selection criteria, publish to lock the
                  version, and download the PDF as your lawsuit-shield
                  artifact.
                </p>
              </div>
              <Link
                href="/dashboard/compliance/criteria/new"
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
              >
                Create criteria
              </Link>
            </div>
          </div>
        )}
        <div className="mt-2 text-right">
          <Link
            href="/dashboard/compliance/criteria"
            className="text-xs text-indigo-600 hover:text-indigo-700"
          >
            All criteria documents →
          </Link>
        </div>
      </section>

      {/* Open findings tile */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
          Open compliance findings
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <SummaryCard
            label="Material legal exposure"
            value={`${findingsCounts.red}`}
            sub="must address"
            tone="red"
          />
          <SummaryCard
            label="Review recommended"
            value={`${findingsCounts.amber}`}
            sub="to review"
            tone="amber"
          />
          <SummaryCard
            label="Informational"
            value={`${findingsCounts.info}`}
            sub="awareness only"
            tone="blue"
          />
        </div>
      </section>

      {/* Listing copy scanner */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
          Listing copy scanner
        </h2>
        <ListingCopyScanner />
      </section>

      {/* Open findings list */}
      {openFindings.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
            Recent open findings ({openFindings.length})
          </h2>
          <div className="space-y-2">
            {openFindings.map((f) => (
              <ComplianceFindingRow key={f.id} finding={f} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
          Audit logs
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Link
            href="/dashboard/leasing-assistant/audit"
            className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50"
          >
            <div className="text-sm font-semibold text-zinc-900">
              Leasing assistant audit
            </div>
            <p className="mt-1 text-xs text-zinc-600">
              Every prospect message — inbound, outbound, generated drafts,
              guardrail flags. 3+ year retention.
            </p>
          </Link>
          <Link
            href="/dashboard/screening/audit"
            className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50"
          >
            <div className="text-sm font-semibold text-zinc-900">
              Screening audit (Proof Check)
            </div>
            <p className="mt-1 text-xs text-zinc-600">
              Every screening run, document upload, AI summary, and
              landlord decision. 7-year retention (FCRA / ECOA).
            </p>
          </Link>
        </div>
      </section>

      {myStatesRules.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
            Your portfolio ({myStatesRules.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {myStatesRules.map((rule) => (
              <StateRuleCard key={rule.id} rule={rule} />
            ))}
          </div>
        </section>
      )}

      {otherResearched.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
            Other researched states ({otherResearched.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {otherResearched.map((rule) => (
              <StateRuleCard key={rule.id} rule={rule} />
            ))}
          </div>
        </section>
      )}

      {/* Helper card for SummaryCard component (defined below) */}

      {unresearched.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Not yet researched ({unresearched.length})
          </h2>
          <p className="mb-4 text-sm text-zinc-600">
            These states haven&rsquo;t been researched yet. They&rsquo;ll
            appear here as placeholders — verify with a qualified attorney
            before acting on anything in these states.
          </p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
            {unresearched.map((rule) => (
              <div
                key={rule.id}
                className="rounded-md border border-dashed border-zinc-300 bg-zinc-50/50 p-3 text-center"
              >
                <div className="text-sm font-medium text-zinc-700">
                  {rule.state}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {rule.state_name}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone: 'red' | 'amber' | 'blue'
}) {
  const toneClass =
    tone === 'red'
      ? 'border-red-200 bg-red-50'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50'
        : 'border-blue-200 bg-blue-50'
  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-600">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900">{value}</div>
      <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>
    </div>
  )
}

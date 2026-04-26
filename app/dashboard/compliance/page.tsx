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
import { ComplianceDisclaimer } from '@/app/ui/compliance-disclaimer'
import { StateRuleCard } from '@/app/ui/state-rule-card'

export default async function CompliancePage() {
  const [allRules, portfolioStates] = await Promise.all([
    getAllStateRules(),
    getStatesInPortfolio(),
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

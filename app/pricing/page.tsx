import Link from 'next/link'
import { getUser } from '@/lib/supabase/get-user'

// Public pricing page. Renders for both signed-in and signed-out
// users — a logged-in landlord can still want to compare tiers
// or share with a partner. The CTA changes based on auth state.

export const metadata = {
  title: 'Pricing — Rentbase',
  description:
    'Simple per-door pricing for independent landlords with 3–20 units. AI screening, fair-housing protection, e-sign, and rent collection — included.',
}

const TIERS = [
  {
    name: 'Solo',
    range: '1–2 units',
    price: '$25',
    pricePer: 'per month, flat',
    features: [
      'All features included',
      'AI screening (Proof Check)',
      'Fair-housing scanner',
      'E-sign + audit trail',
      'Rent collection (Stripe)',
      'Public listing pages',
    ],
    cta: 'Start free',
    href: '/sign-up',
    highlight: false,
  },
  {
    name: 'Small',
    range: '3–10 units',
    price: '$7',
    pricePer: 'per door, per month · $50/mo floor',
    features: [
      'Everything in Solo',
      'Bulk import (CSV)',
      'Inspections + photo timestamping',
      'Maintenance recurring tasks',
      'State-specific compliance rule packs',
      'Email support',
    ],
    cta: 'Start free',
    href: '/sign-up',
    highlight: true,
    badge: 'Most landlords',
  },
  {
    name: 'Mid',
    range: '11–20 units',
    price: '$6',
    pricePer: 'per door, per month · $80/mo floor',
    features: [
      'Everything in Small',
      'Priority support (24h SLA)',
      'Custom branding (logo + color)',
      'Twilio voice line included',
      'Annual compliance review',
    ],
    cta: 'Start free',
    href: '/sign-up',
    highlight: false,
  },
  {
    name: 'Large',
    range: '21+ units',
    price: '$5',
    pricePer: 'per door, per month · $50 base',
    features: [
      'Everything in Mid',
      'Dedicated CS contact',
      'Custom domain (yourname.com)',
      'White-label tenant portal',
      'API access',
      'Onboarding migration assist',
    ],
    cta: 'Talk to us',
    href: 'mailto:hi@rentbase.app?subject=Large%20portfolio%20inquiry',
    highlight: false,
  },
]

const ADDONS = [
  {
    name: 'Premium screening report',
    price: '$40',
    unit: 'per applicant',
    body: 'Adds Checkr criminal/eviction lookup and Persona ID verification on top of Proof Check. You decide; we surface.',
  },
  {
    name: 'Twilio voice line',
    price: '$25',
    unit: 'per month',
    body: 'Dedicated phone number with AI receptionist (Retell) handling tenant maintenance calls and prospect inquiries 24/7.',
  },
  {
    name: 'Annual state-compliance review',
    price: '$200',
    unit: 'per year',
    body: 'A licensed attorney pre-checks your rule pack, lease template, and required disclosures for your state. Recommended yearly.',
  },
  {
    name: 'Legacy lease import',
    price: '$50',
    unit: 'per lease',
    body: 'Send us your existing PDFs; we transcribe them into Rentbase so your historical lease data lives alongside everything new.',
  },
]

const FAQ = [
  {
    q: 'Do you charge per tenant?',
    a: 'No. We charge per door (the unit you own), not per tenant occupying it. A duplex with two leases is two doors, $14/mo on the Small tier.',
  },
  {
    q: 'What happens if my portfolio shrinks?',
    a: 'Your bill drops the next billing cycle. We re-tier automatically based on active leases. No long-term commitment.',
  },
  {
    q: 'Are AI features really included?',
    a: 'Yes. Listing AI generator, Proof Check screening summaries, leasing assistant drafts, paystub OCR — all included on every paid tier. We pay the LLM bill so you don\'t have to think about it.',
  },
  {
    q: 'How does Stripe rent collection pricing work?',
    a: 'Stripe charges 2.9% + 30¢ for cards, ~1% for ACH. We pass these through at cost — no markup. ACH is recommended for rent because the fee is small and predictable.',
  },
  {
    q: 'Do you have a free tier?',
    a: 'Yes — 1 unit, 1 active listing, no AI features, watermarked PDFs. Designed for trying out the listing pages and lead capture before you commit.',
  },
  {
    q: 'Can I save money with annual billing?',
    a: 'Pay annually and get 2 months free (~17% discount). Available on every paid tier.',
  },
  {
    q: 'How does this compare to Buildium / AppFolio?',
    a: 'Buildium starts at $58/mo flat regardless of portfolio size and is built for property managers, not owner-operators. AppFolio has a $250/mo floor. We\'re built specifically for the 3–20 unit owner-operator and include AI features they don\'t have.',
  },
  {
    q: 'How do you protect me from fair-housing complaints?',
    a: 'Three layers: a deterministic listing-copy scanner that flags protected-class language before you publish; a fair-housing system prompt on every AI feature that refuses to make housing decisions; and a per-decision audit log retained for 3+ years (FCRA-grade). You still need a fair-housing attorney for a real complaint, but our system removes the silly mistakes that trigger them.',
  },
]

export default async function PricingPage() {
  const user = await getUser()
  const signedIn = !!user

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-slate-900" />
            <span className="text-lg font-semibold tracking-tight">
              Rentbase
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link
              href="/pricing"
              className="text-slate-900"
            >
              Pricing
            </Link>
            {signedIn ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-slate-600 hover:text-slate-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
                >
                  Start free
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
        {/* Hero */}
        <div className="text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Pricing
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            One price. Every feature.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-7 text-slate-600">
            Per-door pricing that scales with your portfolio. AI screening,
            fair-housing protection, e-sign, and rent collection are
            included on every paid tier — not gated behind &ldquo;Pro&rdquo;
            and &ldquo;Enterprise&rdquo; SKUs.
          </p>
        </div>

        {/* Tier cards */}
        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={
                'relative rounded-2xl border bg-white p-6 ' +
                (tier.highlight
                  ? 'border-indigo-500 shadow-lg shadow-indigo-100'
                  : 'border-slate-200')
              }
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    {tier.badge}
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {tier.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{tier.range}</p>
              </div>

              <div className="mt-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-900">
                    {tier.price}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{tier.pricePer}</p>
              </div>

              <ul className="mt-6 space-y-2 text-sm text-slate-700">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-600">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={tier.href}
                className={
                  'mt-6 block w-full rounded-md px-4 py-2.5 text-center text-sm font-semibold ' +
                  (tier.highlight
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50')
                }
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* What you get on every tier */}
        <section className="mt-24">
          <h2 className="text-2xl font-bold text-slate-900">
            Every paid tier includes
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            We don&rsquo;t play feature-gating games. The same operating
            system on every tier — only the volume scales.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'Public listing pages with custom URLs',
              'AI listing description generator',
              'Prospect pipeline + inquiry inbox',
              'Application form with Turnstile + honeypot',
              'Proof Check forensic screening',
              'AI screening summary (fair-housing safe)',
              'Lease summary PDF generator',
              'Token-based tenant e-sign',
              'Landlord counter-sign + audit trail',
              'Rent schedule auto-generation',
              'Stripe ACH + card collection',
              'Auto-applied late fees (state caps respected)',
              'Maintenance ticket inbox + recurring tasks',
              'Inspections with photo timestamping',
              'Renewal alerts (90-day window)',
              'Notice generator (terminate, late, tenant)',
              'Security deposit accounting + interest accrual',
              'Renters insurance proof tracking',
              'Per-tenant message thread',
              'Workflow center (onboard, offboard, turnover)',
              'Compliance scanner per listing',
              'Reports across properties / units / tenants',
              'Financials with P&amp;L per property',
              'Bulk import (CSV) for properties + tenants',
              'Audit log for FCRA / fair-housing retention',
            ].map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span className="text-slate-700">{f}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Add-ons */}
        <section className="mt-24">
          <h2 className="text-2xl font-bold text-slate-900">
            Optional add-ons
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Pay for what you actually use. None of these are required to
            run Rentbase.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {ADDONS.map((a) => (
              <div
                key={a.name}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-base font-semibold text-slate-900">
                    {a.name}
                  </h3>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">
                      {a.price}
                    </div>
                    <div className="text-xs text-slate-500">{a.unit}</div>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{a.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison */}
        <section className="mt-24">
          <h2 className="text-2xl font-bold text-slate-900">
            How we compare
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Built specifically for the 3–20 unit owner-operator. The
            larger PM platforms aren&rsquo;t.
          </p>
          <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700"></th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Rentbase (10 units)
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    RentRedi
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Buildium
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    AppFolio
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {[
                  ['Monthly cost (10 units)', '$70', '$25', '$58', '$250'],
                  ['Built for owner-operators', '✓', '✓', '–', '–'],
                  ['AI listing generator', '✓', '–', '–', '–'],
                  ['AI screening summary', '✓', '–', '–', '–'],
                  ['Fair-housing scanner', '✓', '–', '–', '–'],
                  ['Token e-sign (no account needed)', '✓', '–', '–', '–'],
                  ['Per-state late fee caps', '✓', '–', '✓', '✓'],
                  [
                    'Audit log retention (FCRA-grade)',
                    '✓',
                    'partial',
                    '✓',
                    '✓',
                  ],
                  ['Free tier', '✓', '–', '–', '–'],
                ].map(([label, ...vals]) => (
                  <tr key={label}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {label}
                    </td>
                    {vals.map((v, i) => (
                      <td
                        key={i}
                        className={
                          'px-4 py-3 ' +
                          (i === 0 ? 'font-semibold text-indigo-700' : '')
                        }
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Pricing as of 2026. Buildium and AppFolio prices are entry tiers
            for portfolios under 50 units; advanced tiers cost significantly
            more.
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-24">
          <h2 className="text-2xl font-bold text-slate-900">
            Questions landlords ask
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {FAQ.map((item) => (
              <div key={item.q}>
                <h3 className="text-base font-semibold text-slate-900">
                  {item.q}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-24 rounded-2xl bg-slate-900 px-8 py-12 text-center">
          <h2 className="text-3xl font-bold text-white">
            Try it on one unit. Free.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-300">
            Test the listing pages, generate a description, screen one
            applicant. No credit card. Upgrade when you&rsquo;re ready
            to bring in your second unit.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/sign-up"
              className="rounded-md bg-white px-6 py-3 text-base font-semibold text-slate-900 hover:bg-slate-100"
            >
              Start free
            </Link>
            <Link
              href="/"
              className="rounded-md border border-slate-700 px-6 py-3 text-base font-semibold text-white hover:bg-slate-800"
            >
              Back to home
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-slate-500">
          <div>© {new Date().getFullYear()} Rentbase</div>
          <div className="flex gap-4">
            <Link href="/pricing" className="hover:text-slate-900">
              Pricing
            </Link>
            <Link href="/sign-in" className="hover:text-slate-900">
              Sign in
            </Link>
            <Link href="/sign-up" className="hover:text-slate-900">
              Start free
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

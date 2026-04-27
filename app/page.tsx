import Link from 'next/link'
import { getUser } from '@/lib/supabase/get-user'
import { redirect } from 'next/navigation'

export default async function Home() {
  // If already signed in, bounce straight to the dashboard.
  // getUser() returns null when env vars are missing (pre-setup),
  // so the landing page still renders before `.env.local` is configured.
  const user = await getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-slate-900" />
            <span className="text-lg font-semibold tracking-tight">
              Rentapp
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link
              href="/pricing"
              className="text-slate-600 hover:text-slate-900"
            >
              Pricing
            </Link>
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
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-24">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            For independent landlords with 3–20 units
          </p>
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-slate-900">
            Your landlord operating system.
          </h1>
          <p className="mt-6 text-xl leading-8 text-slate-600">
            Fill vacancies, collect rent, handle maintenance, and renew leases —
            all in one place. Built around your monthly rhythm, not a software
            feature tree.
          </p>

          <div className="mt-10 flex items-center gap-4">
            <Link
              href="/sign-up"
              className="rounded-md bg-slate-900 px-6 py-3 text-base font-semibold text-white hover:bg-slate-800"
            >
              Start free — no credit card
            </Link>
            <Link
              href="#how-it-works"
              className="text-base font-medium text-slate-700 hover:text-slate-900"
            >
              How it works →
            </Link>
          </div>
        </div>

        <section
          id="how-it-works"
          className="mt-32 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            {
              title: 'Fill vacancies',
              body: 'Post once, sync to Zillow and Apartments.com, capture leads, and run prospects through a pipeline from inquiry to signed lease.',
            },
            {
              title: 'Collect rent',
              body: 'ACH and card via Stripe. Auto-debit on the due date, automatic late fees by state, green/yellow/red payment dashboard at a glance.',
            },
            {
              title: 'Handle maintenance',
              body: 'Tenants submit requests from their portal. You assign, track costs, and log everything for tax time.',
            },
            {
              title: 'Renew leases',
              body: '90-day lease-expiry alerts and automated renewal offer sequences. Turn retention into a system, not a scramble.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-slate-200 bg-white p-6"
            >
              <h3 className="text-base font-semibold text-slate-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {feature.body}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-slate-500">
          <div>© {new Date().getFullYear()} Rentapp</div>
          <div className="flex gap-4">
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

// ============================================================
// Dashboard → Compliance → Criteria library
// ============================================================
//
// List of every tenant selection criteria document the landlord
// has authored. New / edit / publish from the detail page.

import Link from 'next/link'
import { listCriteria } from '@/app/lib/queries/compliance'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function CriteriaListPage() {
  const rows = await listCriteria()

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard/compliance"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Compliance
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Tenant selection criteria
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            The document landlords produce in court to prove their criteria.
            Apply the same criteria to every applicant. Publish to lock the
            version into a downloadable PDF.
          </p>
        </div>
        <Link
          href="/dashboard/compliance/criteria/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Create criteria
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            No criteria yet
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Create your first tenant selection criteria document. Pick a
            jurisdiction, fill in income / credit / history requirements,
            and publish to get the lawsuit-shield PDF.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/compliance/criteria/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Create your first criteria
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>Name</Th>
                <Th>Jurisdiction</Th>
                <Th>Status</Th>
                <Th>Last edited</Th>
                <Th>Published</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {rows.map((c) => (
                <tr key={c.id} className="even:bg-zinc-50/40">
                  <Td>
                    <Link
                      href={`/dashboard/compliance/criteria/${c.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {c.name}
                    </Link>
                  </Td>
                  <Td>{c.jurisdiction}</Td>
                  <Td>
                    {c.is_published ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                        Draft
                      </span>
                    )}
                  </Td>
                  <Td>{formatDate(c.updated_at)}</Td>
                  <Td>{formatDate(c.published_at)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600"
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 align-top text-sm text-zinc-900">{children}</td>
  )
}

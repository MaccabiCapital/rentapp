// ============================================================
// Dashboard → Tenants → list page
// ============================================================

import Link from 'next/link'
import { getTenants } from '@/app/lib/queries/tenants'
import { TenantsEmptyState } from '@/app/ui/tenants-empty-state'

export default async function TenantsPage() {
  const tenants = await getTenants()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Tenants</h1>
        <Link
          href="/dashboard/tenants/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Add tenant
        </Link>
      </div>

      {tenants.length === 0 ? (
        <TenantsEmptyState />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Added</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {tenants.map((t) => (
                <tr key={t.id} className="even:bg-zinc-50/40">
                  <Td>
                    <Link
                      href={`/dashboard/tenants/${t.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {t.last_name}, {t.first_name}
                    </Link>
                  </Td>
                  <Td>{t.email ?? '—'}</Td>
                  <Td>{t.phone ?? '—'}</Td>
                  <Td>
                    {new Date(t.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Td>
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
  return <td className="px-4 py-3 text-sm text-zinc-900">{children}</td>
}

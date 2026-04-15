// ============================================================
// RentRollStats — 3-stat summary bar above the rent roll table
// ============================================================
//
// Computed from the same data array passed to the table — no
// additional query. Hidden when there are zero units (the empty
// state takes over the page).

import type { UnitWithProperty } from '@/app/lib/queries/units'

export function RentRollStats({ units }: { units: UnitWithProperty[] }) {
  if (units.length === 0) return null

  const occupied = units.filter((u) => u.status === 'occupied').length
  const vacant = units.filter((u) => u.status === 'vacant').length

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      <StatCard label="Total Units" value={units.length} />
      <StatCard label="Occupied" value={occupied} tone="green" />
      <StatCard label="Vacant" value={vacant} tone="zinc" />
    </div>
  )
}

function StatCard({
  label,
  value,
  tone = 'zinc',
}: {
  label: string
  value: number
  tone?: 'green' | 'zinc'
}) {
  const valueClass =
    tone === 'green' ? 'text-green-700' : 'text-zinc-900'
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className={`text-3xl font-semibold ${valueClass}`}>{value}</div>
      <div className="mt-1 text-sm text-zinc-500">{label}</div>
    </div>
  )
}

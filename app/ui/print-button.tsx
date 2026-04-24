'use client'

// ============================================================
// Print-trigger button — calls window.print() on click
// ============================================================
//
// Server components can't attach click handlers, so we lift
// the tiny print trigger into a client component.

export function PrintButton({
  label = 'Print / PDF',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ??
        'rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50'
      }
    >
      {label}
    </button>
  )
}

// Placeholder component used by module pages in sprint 0.
// Sprint 1+ will replace each module's page.tsx with the real UI.

export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-slate-600">{body}</p>

      <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-slate-400"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h2 className="mt-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Sprint 1
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          This module lands after customer discovery. Until then, the database
          table and RLS policies are already in place in{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
            db/schema.sql
          </code>
          .
        </p>
      </div>
    </div>
  )
}

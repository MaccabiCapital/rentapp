// ============================================================
// ComplianceDisclaimer — big yellow "not legal advice" banner
// ============================================================
//
// Every page that shows state rent rules MUST render this
// banner above the content. Legal-content-as-software means
// we explicitly don't give advice — we surface a reference
// and send the landlord to their attorney for anything
// high-stakes.

export function ComplianceDisclaimer() {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="flex items-start gap-3">
        <svg
          className="mt-0.5 h-5 w-5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        <div>
          <p className="font-semibold uppercase tracking-wide text-xs">
            Reference only — not legal advice
          </p>
          <p className="mt-1 text-sm">
            The rules below are compiled from public state landlord-tenant
            handbooks and may be out of date. Every row shows when it was
            last verified — anything older than 90 days should be double-
            checked. Always consult a qualified attorney in your state
            before acting on any of this.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Shared formatting helpers
// ============================================================
//
// Every dashboard page used to define its own copy of these.
// Extracting here so locale / precision / null-handling changes
// only happen in one place.

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

export function formatCurrencyWithCents(
  value: number | null | undefined,
): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

/**
 * Format a YYYY-MM-DD string (DATE column) or full ISO timestamp
 * as "Mar 15, 2026". Returns '—' for null/undefined.
 *
 * NOTE: for YYYY-MM-DD date-only strings, we pin to UTC to avoid
 * the timezone-regression where '2026-03-15' parses as midnight
 * UTC and displays as 'Mar 14' in negative-offset locales.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  // YYYY-MM-DD? Add explicit UTC time so local display matches.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value) ? 'UTC' : undefined,
  })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

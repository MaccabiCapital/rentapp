// ============================================================
// Tiny CSV parser — handles quoted fields + embedded commas/quotes
// ============================================================
//
// Not as battle-tested as PapaParse, but dependency-free and
// sufficient for our import flows. Accepts either CRLF or LF
// line endings and doubles-double-quotes as an escape.

export function parseCsv(input: string): string[][] {
  const rows: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  const len = input.length

  while (i < len) {
    const ch = input[i]

    if (inQuotes) {
      if (ch === '"') {
        // Look ahead for escaped quote
        if (i + 1 < len && input[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += ch
      i += 1
      continue
    }

    if (ch === '"') {
      inQuotes = true
      i += 1
      continue
    }

    if (ch === ',') {
      current.push(field)
      field = ''
      i += 1
      continue
    }

    if (ch === '\n' || ch === '\r') {
      current.push(field)
      rows.push(current)
      field = ''
      current = []
      // Consume a following \n after \r for CRLF
      if (ch === '\r' && i + 1 < len && input[i + 1] === '\n') {
        i += 2
      } else {
        i += 1
      }
      continue
    }

    field += ch
    i += 1
  }

  // Flush trailing field / row if present
  if (field !== '' || current.length > 0) {
    current.push(field)
    rows.push(current)
  }

  // Strip empty trailing rows
  while (rows.length > 0 && rows[rows.length - 1].every((f) => f === '')) {
    rows.pop()
  }

  return rows
}

// Normalize a header row — lowercase, trim, snake_case.
export function normalizeHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

// Map header row to column indexes. Returns { index[headerName] = columnIndex }
export function indexHeader(
  headers: string[],
): Record<string, number> {
  const map: Record<string, number> = {}
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(headers[i])
    if (h) map[h] = i
  }
  return map
}

export function getCell(
  row: string[],
  headerIndex: Record<string, number>,
  headerName: string,
): string | undefined {
  const idx = headerIndex[headerName]
  if (idx === undefined || idx >= row.length) return undefined
  const v = row[idx].trim()
  return v === '' ? undefined : v
}

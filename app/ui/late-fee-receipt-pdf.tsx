// ============================================================
// LateFeeReceiptPdf — receipt for a paid late fee charge
// ============================================================

import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 56,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#111827',
    lineHeight: 1.5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 24,
  },
  block: { marginBottom: 14 },
  label: {
    fontSize: 9,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  line: { fontSize: 10 },
  totalsBlock: {
    marginTop: 4,
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1pt solid #d1d5db',
  },
  amountLabel: { fontSize: 12, fontWeight: 'bold', color: '#111827' },
  amountValue: { fontSize: 12, fontWeight: 'bold', color: '#065f46' },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 56,
    right: 56,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    borderTop: '0.5pt solid #e5e7eb',
    paddingTop: 6,
  },
})

export type LateFeeReceiptPdfProps = {
  receiptIdShort: string
  paidOn: string
  amount: number
  rentScheduleDueDate: string | null
  rentMonthlyRent: number | null
  notes: string | null
  source: 'auto_scan' | 'manual'
  tenant: { name: string }
  property: {
    name: string
    unit_label: string | null
  }
  landlord: {
    name: string
    address_lines: string[]
    contact_line: string | null
    logoUrl: string | null
  }
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(
    iso + (iso.length === 10 ? 'T00:00:00Z' : ''),
  ).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export function LateFeeReceiptPdf(props: LateFeeReceiptPdfProps) {
  const {
    receiptIdShort,
    paidOn,
    amount,
    rentScheduleDueDate,
    rentMonthlyRent,
    notes,
    source,
    tenant,
    property,
    landlord,
  } = props

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {landlord.logoUrl && (
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image */}
            <Image
              src={landlord.logoUrl}
              style={{ maxHeight: 40, maxWidth: 160 }}
            />
          </View>
        )}

        <View style={styles.block}>
          <Text style={styles.label}>From</Text>
          <Text style={styles.line}>{landlord.name}</Text>
          {landlord.address_lines.map((l, i) => (
            <Text key={i} style={styles.line}>
              {l}
            </Text>
          ))}
          {landlord.contact_line && (
            <Text style={styles.line}>{landlord.contact_line}</Text>
          )}
        </View>

        <Text style={styles.title}>Late Fee Receipt</Text>
        <Text style={styles.subtitle}>
          Paid on {formatDate(paidOn)} · Receipt #{receiptIdShort}
        </Text>

        <View style={styles.block}>
          <Text style={styles.label}>Tenant</Text>
          <Text style={styles.line}>{tenant.name}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Property</Text>
          <Text style={styles.line}>
            {property.name}
            {property.unit_label ? ` · ${property.unit_label}` : ''}
          </Text>
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text>Rent period due</Text>
            <Text>{formatDate(rentScheduleDueDate)}</Text>
          </View>
          {rentMonthlyRent !== null && (
            <View style={styles.totalsRow}>
              <Text>Monthly rent</Text>
              <Text>{formatMoney(rentMonthlyRent)}</Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <Text>Source</Text>
            <Text>
              {source === 'auto_scan'
                ? 'Auto-applied'
                : 'Manually applied'}
            </Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Late fee paid</Text>
            <Text style={styles.amountValue}>{formatMoney(amount)}</Text>
          </View>
        </View>

        {notes && (
          <View style={styles.block}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.line}>{notes}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>
            Receipt {receiptIdShort} · {landlord.name} · Generated{' '}
            {formatDate(paidOn)}
          </Text>
          <Text style={{ marginTop: 2 }}>Generated by Rentbase.</Text>
        </View>
      </Page>
    </Document>
  )
}

// ============================================================
// TaxPackagePdf — year-end portfolio P&L summary
// ============================================================
//
// One-page PDF landlords hand to their accountant. Not a
// substitute for Schedule E itself — just the numbers, per
// property and in total, derived from the same query
// (getPortfolioPnL) that powers /dashboard/financials.

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { PropertyPnL } from '@/app/lib/queries/financials'

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#171717',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: '2pt solid #4f46e5',
  },
  logo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #e5e7eb',
    paddingVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #9ca3af',
    paddingBottom: 4,
  },
  totalRow: {
    flexDirection: 'row',
    borderTop: '1pt solid #171717',
    paddingTop: 6,
    marginTop: 4,
  },
  cellName: { flex: 2 },
  cellNumber: { flex: 1, textAlign: 'right' },
  cellNumberBold: { flex: 1, textAlign: 'right', fontWeight: 'bold' },
  headerCell: { fontWeight: 'bold', fontSize: 9, color: '#374151' },
  notesBox: {
    marginTop: 24,
    padding: 10,
    backgroundColor: '#f9fafb',
    border: '0.5pt solid #d1d5db',
    borderRadius: 4,
    fontSize: 9,
    color: '#4b5563',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    borderTop: '0.5pt solid #e5e7eb',
    paddingTop: 8,
  },
})

function currency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export function TaxPackagePdf({
  rows,
  totals,
  fromDate,
  toDate,
  landlordName,
  generatedOn,
}: {
  rows: PropertyPnL[]
  totals: {
    income: number
    expenses_logged: number
    maintenance_costs: number
    total_expenses: number
    net_operating_income: number
  }
  fromDate: string
  toDate: string
  landlordName: string
  generatedOn: string
}) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logo}>Rentapp</Text>
          <Text style={styles.title}>Year-end tax package</Text>
          <Text style={styles.subtitle}>
            {landlordName} · {fromDate} to {toDate}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Portfolio P&amp;L by property
          </Text>

          <View style={styles.headerRow}>
            <Text style={[styles.cellName, styles.headerCell]}>Property</Text>
            <Text style={[styles.cellNumber, styles.headerCell]}>Income</Text>
            <Text style={[styles.cellNumber, styles.headerCell]}>Expenses</Text>
            <Text style={[styles.cellNumber, styles.headerCell]}>
              Maintenance
            </Text>
            <Text style={[styles.cellNumber, styles.headerCell]}>NOI</Text>
          </View>

          {rows.length === 0 ? (
            <View style={styles.row}>
              <Text style={styles.cellName}>
                No income or expenses logged in this window.
              </Text>
            </View>
          ) : (
            rows.map((r) => (
              <View key={r.property_id} style={styles.row}>
                <Text style={styles.cellName}>{r.property_name}</Text>
                <Text style={styles.cellNumber}>{currency(r.income)}</Text>
                <Text style={styles.cellNumber}>
                  {currency(r.expenses_logged)}
                </Text>
                <Text style={styles.cellNumber}>
                  {currency(r.maintenance_costs)}
                </Text>
                <Text style={styles.cellNumber}>
                  {currency(r.net_operating_income)}
                </Text>
              </View>
            ))
          )}

          <View style={styles.totalRow}>
            <Text style={[styles.cellName, { fontWeight: 'bold' }]}>
              Total
            </Text>
            <Text style={styles.cellNumberBold}>{currency(totals.income)}</Text>
            <Text style={styles.cellNumberBold}>
              {currency(totals.expenses_logged)}
            </Text>
            <Text style={styles.cellNumberBold}>
              {currency(totals.maintenance_costs)}
            </Text>
            <Text style={styles.cellNumberBold}>
              {currency(totals.net_operating_income)}
            </Text>
          </View>
        </View>

        <View style={styles.notesBox}>
          <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>
            How to read this
          </Text>
          <Text style={{ marginBottom: 3 }}>
            Income = rent payments received (Stripe + manual) in the window.
          </Text>
          <Text style={{ marginBottom: 3 }}>
            Expenses = logged Schedule E expenses (insurance, mortgage
            interest, utilities, management fees, supplies, etc.).
          </Text>
          <Text style={{ marginBottom: 3 }}>
            Maintenance = material + labor costs from maintenance requests
            marked resolved. Vendor-specific detail is in the per-property
            ledger at /dashboard/financials.
          </Text>
          <Text>
            NOI = Income − (Expenses + Maintenance). This is operating income
            only — it does not include depreciation or mortgage principal.
            Ask your accountant before filing.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            Generated {generatedOn} · Rentapp portfolio summary · Not tax
            advice
          </Text>
        </View>
      </Page>
    </Document>
  )
}

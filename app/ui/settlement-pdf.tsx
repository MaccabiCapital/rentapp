// ============================================================
// SettlementPdf — itemized deposit accounting letter
// ============================================================
//
// Generates the legally-required move-out accounting letter:
//   - DRAFT banner (until attorney review per state)
//   - Landlord + tenant address blocks
//   - Lease summary (term, deposit on file)
//   - Itemized deduction table (category + description + amount)
//   - Net refund / balance owed line
//   - Mailing method line + signature block
//   - State deadline citation in footer

import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import {
  DEDUCTION_CATEGORY_LABELS,
  formatMoney,
  type DeductionItem,
  type SettlementStatus,
} from '@/app/lib/schemas/security-deposit'

const styles = StyleSheet.create({
  page: {
    padding: 56,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#111827',
    lineHeight: 1.5,
  },
  disclaimer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#fef3c7',
    border: '1pt solid #fbbf24',
    borderRadius: 4,
  },
  disclaimerTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 9,
    color: '#78350f',
    lineHeight: 1.4,
  },
  block: { marginBottom: 16 },
  label: {
    fontSize: 9,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  line: { fontSize: 10, marginBottom: 2 },
  reLine: { marginTop: 16, fontSize: 10, fontWeight: 'bold' },
  title: {
    marginTop: 24,
    marginBottom: 16,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  paragraph: {
    marginBottom: 10,
    fontSize: 11,
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  table: {
    marginTop: 10,
    marginBottom: 16,
    border: '1pt solid #d1d5db',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottom: '1pt solid #d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #e5e7eb',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRowLast: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cellHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
  },
  cell: {
    fontSize: 10,
    color: '#111827',
  },
  cellAmount: {
    fontSize: 10,
    color: '#111827',
    textAlign: 'right',
  },
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
  totalsLabel: { fontSize: 10, color: '#374151' },
  totalsValue: { fontSize: 10, color: '#111827' },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1pt solid #d1d5db',
  },
  netLabel: { fontSize: 12, fontWeight: 'bold', color: '#111827' },
  netValueRefund: { fontSize: 12, fontWeight: 'bold', color: '#065f46' },
  netValueOwed: { fontSize: 12, fontWeight: 'bold', color: '#991b1b' },
  signatureBlock: { marginTop: 32 },
  signatureLine: {
    marginTop: 24,
    borderBottom: '1pt solid #111827',
    width: 240,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 4,
  },
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

export type SettlementPdfProps = {
  status: SettlementStatus
  generatedOn: string
  settlementIdShort: string
  landlord: {
    name: string
    address_lines?: string[]
    contact_line?: string | null
    logoUrl?: string | null
  }
  tenant: {
    name: string
    forwarding_street_address: string | null
    forwarding_unit: string | null
    forwarding_city: string | null
    forwarding_state: string | null
    forwarding_postal_code: string | null
  }
  property: {
    name: string
    street_address: string | null
    unit_label: string | null
    city: string | null
    state: string | null
    postal_code: string | null
  }
  lease: {
    start_date: string
    end_date: string
  } | null
  originalDeposit: number
  totalDeductions: number
  net: number
  items: DeductionItem[]
  legalDeadlineDate: string | null
  stateReturnDays: number | null
  mailMethod: string | null
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : '')).toLocaleDateString(
    'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  )
}

export function SettlementPdf(props: SettlementPdfProps) {
  const {
    status,
    generatedOn,
    settlementIdShort,
    landlord,
    tenant,
    property,
    lease,
    originalDeposit,
    totalDeductions,
    net,
    items,
    legalDeadlineDate,
    stateReturnDays,
  } = props

  const isRefund = net >= 0
  const isDraft = status === 'draft'

  const tenantAddr = [
    tenant.forwarding_street_address,
    tenant.forwarding_unit,
    [tenant.forwarding_city, tenant.forwarding_state, tenant.forwarding_postal_code]
      .filter(Boolean)
      .join(', '),
  ].filter(Boolean)

  const propertyAddrLine = [
    property.street_address,
    property.unit_label ? `Unit ${property.unit_label}` : null,
  ]
    .filter(Boolean)
    .join(', ')

  const propertyCityLine = [property.city, property.state, property.postal_code]
    .filter(Boolean)
    .join(', ')

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* DRAFT banner shown until mailed */}
        {isDraft && (
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerTitle}>
              DRAFT — review before mailing
            </Text>
            <Text style={styles.disclaimerText}>
              State law dictates the deadline, mailing method, and required
              contents of this letter. Have it reviewed by an attorney
              licensed in the property&apos;s state before mailing. Rentapp
              is not a law firm.
            </Text>
          </View>
        )}

        {/* Optional logo at top */}
        {landlord.logoUrl && (
          <View style={{ marginBottom: 8 }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image */}
            <Image
              src={landlord.logoUrl}
              style={{ maxHeight: 40, maxWidth: 160 }}
            />
          </View>
        )}

        {/* Landlord (sender) block */}
        <View style={styles.block}>
          <Text style={styles.label}>From</Text>
          <Text style={styles.line}>{landlord.name}</Text>
          {(landlord.address_lines ?? []).map((line, i) => (
            <Text key={i} style={styles.line}>
              {line}
            </Text>
          ))}
          {landlord.contact_line && (
            <Text style={styles.line}>{landlord.contact_line}</Text>
          )}
        </View>

        {/* Date */}
        <Text style={styles.line}>Date: {formatDate(generatedOn)}</Text>

        {/* Tenant (recipient) block */}
        <View style={[styles.block, { marginTop: 20 }]}>
          <Text style={styles.label}>To</Text>
          <Text style={styles.line}>{tenant.name}</Text>
          {tenantAddr.length > 0 ? (
            tenantAddr.map((line, i) => (
              <Text key={i} style={styles.line}>
                {line}
              </Text>
            ))
          ) : (
            <Text style={[styles.line, { color: '#dc2626' }]}>
              [forwarding address not recorded]
            </Text>
          )}
        </View>

        {/* RE: line */}
        <Text style={styles.reLine}>
          RE: Security Deposit Accounting — {property.name}
          {propertyAddrLine ? `, ${propertyAddrLine}` : ''}
          {propertyCityLine ? `, ${propertyCityLine}` : ''}
        </Text>

        {/* Title */}
        <Text style={styles.title}>Itemized Security Deposit Statement</Text>

        {/* Opening paragraph */}
        <Text style={styles.paragraph}>
          This letter accounts for the security deposit you paid in connection
          with your lease at the rental property identified above
          {lease ? ` (lease term ${formatDate(lease.start_date)} through ${formatDate(lease.end_date)})` : ''}
          . The original deposit amount, all deductions, and the resulting{' '}
          {isRefund ? 'refund' : 'balance owed'} are itemized below.
        </Text>

        {/* Itemized table */}
        {items.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.cellHeader, { width: '25%' }]}>Category</Text>
              <Text style={[styles.cellHeader, { width: '55%' }]}>
                Description
              </Text>
              <Text
                style={[
                  styles.cellHeader,
                  { width: '20%', textAlign: 'right' },
                ]}
              >
                Amount
              </Text>
            </View>
            {items.map((item, idx) => (
              <View
                key={item.id}
                style={
                  idx === items.length - 1
                    ? styles.tableRowLast
                    : styles.tableRow
                }
              >
                <Text style={[styles.cell, { width: '25%' }]}>
                  {DEDUCTION_CATEGORY_LABELS[item.category]}
                </Text>
                <Text style={[styles.cell, { width: '55%' }]}>
                  {item.description}
                </Text>
                <Text style={[styles.cellAmount, { width: '20%' }]}>
                  {formatMoney(item.amount)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.paragraph}>
            No deductions are being taken from your security deposit.
          </Text>
        )}

        {/* Totals block */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Original deposit</Text>
            <Text style={styles.totalsValue}>{formatMoney(originalDeposit)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total deductions</Text>
            <Text style={styles.totalsValue}>
              −{formatMoney(totalDeductions)}
            </Text>
          </View>
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>
              {isRefund ? 'Refund due to tenant' : 'Balance owed by tenant'}
            </Text>
            <Text style={isRefund ? styles.netValueRefund : styles.netValueOwed}>
              {formatMoney(Math.abs(net))}
            </Text>
          </View>
        </View>

        {/* Closing paragraph */}
        {isRefund ? (
          <Text style={styles.paragraph}>
            A check in the amount of <Text style={{ fontWeight: 'bold' }}>{formatMoney(net)}</Text>{' '}
            is enclosed with this letter, payable to {tenant.name}. If you
            disagree with any portion of this accounting, please contact me in
            writing within a reasonable period of time so we can discuss.
          </Text>
        ) : (
          <Text style={styles.paragraph}>
            The deductions listed above exceeded your security deposit. The
            remaining balance of{' '}
            <Text style={{ fontWeight: 'bold' }}>{formatMoney(Math.abs(net))}</Text>{' '}
            is due. Please remit payment within 30 days, or contact me in
            writing to discuss a payment plan or any portion of this accounting
            you wish to dispute.
          </Text>
        )}

        {/* Signature block */}
        <View style={styles.signatureBlock}>
          <Text style={styles.line}>Sincerely,</Text>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>{landlord.name}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            Settlement {settlementIdShort}
            {legalDeadlineDate
              ? ` · Legal deadline: ${formatDate(legalDeadlineDate)}`
              : ''}
            {stateReturnDays && property.state
              ? ` (${property.state} requires ${stateReturnDays} days from lease end)`
              : ''}
          </Text>
          <Text style={{ marginTop: 2 }}>
            Generated by Rentbase. Not legal advice. Have your specific
            jurisdiction reviewed by a licensed attorney.
          </Text>
        </View>
      </Page>
    </Document>
  )
}

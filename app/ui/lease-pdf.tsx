// ============================================================
// LeasePdf — React-PDF template for the printable lease
// ============================================================
//
// NOT a legally binding lease. This is a one-page summary of
// the terms already in the lease record, intended for:
//   - printing out for a signature meeting
//   - archiving a snapshot of the agreed-upon terms
//   - handing to an attorney for finalization
//
// Every rendered PDF carries a big disclaimer banner that it is
// a reference summary, not a legal lease. A real finalized lease
// requires a state-specific template (Sprint 9.B) and attorney
// review.

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import type { Lease } from '@/app/lib/schemas/lease'
import type { Tenant } from '@/app/lib/schemas/tenant'
import type { Property } from '@/app/lib/schemas/property'
import type { Unit } from '@/app/lib/schemas/unit'

export type LeasePdfSignature = {
  imageDataUrl: string | null
  typedName: string | null
  signedAt: string | null
  signedIp: string | null
}

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#171717',
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: '2pt solid #4f46e5',
  },
  logo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  disclaimer: {
    marginTop: 16,
    padding: 10,
    backgroundColor: '#fef3c7',
    border: '1pt solid #fbbf24',
    borderRadius: 4,
  },
  disclaimerTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 9,
    color: '#78350f',
    lineHeight: 1.4,
  },
  section: {
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4f46e5',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1pt solid #e5e7eb',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    width: '35%',
    color: '#6b7280',
    fontSize: 10,
  },
  value: {
    width: '65%',
    color: '#171717',
    fontSize: 10,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 16,
  },
  column: {
    flex: 1,
  },
  notes: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#f9fafb',
    border: '1pt solid #e5e7eb',
    borderRadius: 4,
    fontSize: 9,
    lineHeight: 1.4,
  },
  signatureBlock: {
    marginTop: 32,
    flexDirection: 'row',
    gap: 32,
  },
  signatureBox: {
    flex: 1,
  },
  signatureLine: {
    borderBottom: '1pt solid #171717',
    marginBottom: 4,
    marginTop: 32,
  },
  signatureImage: {
    height: 56,
    marginBottom: 2,
    objectFit: 'contain',
    objectPositionX: 0,
  },
  signatureImageLine: {
    borderBottom: '1pt solid #171717',
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
  signatureCaption: {
    fontSize: 8,
    color: '#374151',
    marginTop: 4,
    lineHeight: 1.3,
  },
  signatureBadge: {
    fontSize: 7,
    color: '#065f46',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    borderTop: '1pt solid #e5e7eb',
    paddingTop: 8,
  },
})

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export type LeasePdfProps = {
  lease: Lease
  tenant: Tenant
  unit: Unit
  property: Property
  generatedOn: string
  signatures?: {
    tenant: LeasePdfSignature | null
    landlord: LeasePdfSignature | null
  }
}

export function LeasePdf({
  lease,
  tenant,
  unit,
  property,
  generatedOn,
  signatures,
}: LeasePdfProps) {
  const tenantSig = signatures?.tenant ?? null
  const landlordSig = signatures?.landlord ?? null
  const unitLabel = unit.unit_number
    ? `${property.name} · Unit ${unit.unit_number}`
    : property.name
  const tenantFullName = `${tenant.first_name} ${tenant.last_name}`.trim()

  return (
    <Document title={`Lease Summary — ${tenantFullName}`}>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Rentbase</Text>
          <Text style={styles.title}>Lease Summary</Text>
          <Text style={styles.subtitle}>
            {unitLabel} · Generated {formatDate(generatedOn)}
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>
            REFERENCE ONLY — NOT A LEGALLY BINDING LEASE
          </Text>
          <Text style={styles.disclaimerText}>
            This document summarizes the terms stored in your Rentbase
            account. It is not a legal lease. A real lease requires a
            state-specific template with required disclosures, reviewed by a
            qualified attorney. Do not substitute this document for a
            finalized lease signed by both parties.
          </Text>
        </View>

        {/* Parties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parties</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Tenant</Text>
            <Text style={styles.value}>{tenantFullName}</Text>
          </View>
          {tenant.email && (
            <View style={styles.row}>
              <Text style={styles.label}>Tenant email</Text>
              <Text style={styles.value}>{tenant.email}</Text>
            </View>
          )}
          {tenant.phone && (
            <View style={styles.row}>
              <Text style={styles.label}>Tenant phone</Text>
              <Text style={styles.value}>{tenant.phone}</Text>
            </View>
          )}
        </View>

        {/* Property */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Property</Text>
            <Text style={styles.value}>{property.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>
              {property.street_address}, {property.city}, {property.state}{' '}
              {property.postal_code}
            </Text>
          </View>
          {unit.unit_number && (
            <View style={styles.row}>
              <Text style={styles.label}>Unit</Text>
              <Text style={styles.value}>{unit.unit_number}</Text>
            </View>
          )}
          {(unit.bedrooms !== null || unit.bathrooms !== null) && (
            <View style={styles.row}>
              <Text style={styles.label}>Bed / Bath</Text>
              <Text style={styles.value}>
                {unit.bedrooms ?? 0} / {unit.bathrooms ?? 0}
              </Text>
            </View>
          )}
          {unit.square_feet !== null && (
            <View style={styles.row}>
              <Text style={styles.label}>Square feet</Text>
              <Text style={styles.value}>{unit.square_feet}</Text>
            </View>
          )}
        </View>

        {/* Lease terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lease Terms</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Start date</Text>
            <Text style={styles.value}>{formatDate(lease.start_date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>End date</Text>
            <Text style={styles.value}>{formatDate(lease.end_date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Monthly rent</Text>
            <Text style={styles.value}>
              {formatCurrency(lease.monthly_rent)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Rent due on</Text>
            <Text style={styles.value}>
              Day {lease.rent_due_day} of each month
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Security deposit</Text>
            <Text style={styles.value}>
              {formatCurrency(lease.security_deposit)}
            </Text>
          </View>
          {lease.late_fee_amount !== null && (
            <View style={styles.row}>
              <Text style={styles.label}>Late fee</Text>
              <Text style={styles.value}>
                {formatCurrency(lease.late_fee_amount)} after{' '}
                {lease.late_fee_grace_days ?? 0} grace days
              </Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{lease.status}</Text>
          </View>
          {lease.tenant_notice_given_on && (
            <View style={styles.row}>
              <Text style={styles.label}>Tenant notice given</Text>
              <Text style={styles.value}>
                {formatDate(lease.tenant_notice_given_on)}
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {lease.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notes}>
              <Text>{lease.notes}</Text>
            </View>
          </View>
        )}

        {/* Signature block */}
        <View style={styles.signatureBlock}>
          <SignatureColumn
            label="Tenant signature / date"
            signature={tenantSig}
            fallbackName={tenantFullName}
          />
          <SignatureColumn
            label="Landlord signature / date"
            signature={landlordSig}
            fallbackName={null}
          />
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by Rentbase on {formatDate(generatedOn)}. This document
          is a reference summary only. Verify all legal requirements with a
          qualified attorney in your state.
        </Text>
      </Page>
    </Document>
  )
}

function SignatureColumn({
  label,
  signature,
  fallbackName,
}: {
  label: string
  signature: LeasePdfSignature | null
  fallbackName: string | null
}) {
  const isSigned =
    !!signature?.imageDataUrl && !!signature.signedAt
  const displayName =
    signature?.typedName ?? fallbackName ?? null

  if (!isSigned) {
    return (
      <View style={styles.signatureBox}>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureLabel}>{label}</Text>
      </View>
    )
  }

  return (
    <View style={styles.signatureBox}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, not html */}
      <Image
        src={signature!.imageDataUrl!}
        style={styles.signatureImage}
      />
      <View style={styles.signatureImageLine} />
      <Text style={styles.signatureLabel}>{label}</Text>
      {displayName && (
        <Text style={styles.signatureCaption}>{displayName}</Text>
      )}
      <Text style={styles.signatureCaption}>
        Signed {formatDateTime(signature!.signedAt)}
      </Text>
      {signature!.signedIp && (
        <Text style={styles.signatureBadge}>
          Electronically signed · IP {signature!.signedIp}
        </Text>
      )}
    </View>
  )
}

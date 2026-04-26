// ============================================================
// CriteriaPdf — tenant selection criteria document
// ============================================================
//
// Generates the lawsuit-shield artifact: the document landlords
// produce in court to prove the criteria they applied to every
// applicant. v1 is a clean text layout — design polish in v2.
//
// Footer carries:
//   - Jurisdiction citation
//   - Fair-housing disclosure (mirrors leasing-assistant audit)
//   - Version number + generated-on timestamp
//   - DRAFT banner until is_published === true

import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { TenantSelectionCriteria } from '@/app/lib/schemas/compliance'

const styles = StyleSheet.create({
  page: {
    padding: 56,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#111827',
    lineHeight: 1.5,
  },
  draftBanner: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#fef3c7',
    border: '1pt solid #fbbf24',
    borderRadius: 4,
  },
  draftTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  draftText: {
    fontSize: 9,
    color: '#78350f',
    lineHeight: 1.4,
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
  section: {
    marginBottom: 18,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottom: '0.5pt solid #d1d5db',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  field: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  fieldLabel: {
    width: 180,
    fontSize: 10,
    color: '#374151',
  },
  fieldValue: {
    flex: 1,
    fontSize: 10,
    color: '#111827',
  },
  paragraph: {
    fontSize: 10,
    marginBottom: 8,
    textAlign: 'justify',
    lineHeight: 1.5,
  },
  disclosureBlock: {
    marginTop: 28,
    padding: 12,
    border: '0.5pt solid #d1d5db',
    borderRadius: 4,
    backgroundColor: '#f9fafb',
  },
  disclosureTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  disclosureText: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.5,
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

const DEFAULT_REASONABLE_ACCOMMODATIONS = `In accordance with the Fair Housing Act and applicable state and local laws, this housing provider will consider all reasonable accommodation requests from applicants and tenants with disabilities. Service animals and emotional support animals (ESAs) are not pets and are not subject to pet policies, fees, or deposits.`

export type CriteriaPdfProps = {
  criteria: TenantSelectionCriteria
  jurisdictionName: string
  version: number
  generatedOn: string
  landlordName: string
  businessAddress?: {
    street: string | null
    unit: string | null
    city: string | null
    state: string | null
    postal_code: string | null
  } | null
  businessEmail?: string | null
  businessPhone?: string | null
  logoUrl?: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function yesNo(v: boolean | null): string {
  if (v === null) return 'Not specified'
  return v ? 'Yes' : 'No'
}

function num(v: number | null, suffix = ''): string {
  if (v === null || v === undefined) return 'Not specified'
  return `${v}${suffix}`
}

function listOrNot(v: string[] | null): string {
  if (!v || v.length === 0) return 'None'
  return v.join('; ')
}

function formatBusinessAddress(
  addr: CriteriaPdfProps['businessAddress'],
): string | null {
  if (!addr) return null
  const lines: string[] = []
  if (addr.street) {
    lines.push(addr.unit ? `${addr.street}, ${addr.unit}` : addr.street)
  }
  const cityLine = [addr.city, addr.state, addr.postal_code]
    .filter(Boolean)
    .join(', ')
  if (cityLine) lines.push(cityLine)
  return lines.length > 0 ? lines.join(' · ') : null
}

export function CriteriaPdf(props: CriteriaPdfProps) {
  const {
    criteria,
    jurisdictionName,
    version,
    generatedOn,
    landlordName,
    businessAddress,
    businessEmail,
    businessPhone,
    logoUrl,
  } = props
  const formattedAddress = formatBusinessAddress(businessAddress)
  const contactLine = [businessEmail, businessPhone].filter(Boolean).join(' · ')
  const isDraft = !criteria.is_published

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {isDraft && (
          <View style={styles.draftBanner}>
            <Text style={styles.draftTitle}>DRAFT — not yet published</Text>
            <Text style={styles.draftText}>
              This document is a working draft. Publish it before relying on
              it as your stated tenant selection criteria. Have it reviewed
              by an attorney licensed in {jurisdictionName} before applying
              it to applicants.
            </Text>
          </View>
        )}

        {logoUrl && (
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, not HTML img */}
            <Image src={logoUrl} style={{ maxHeight: 48, maxWidth: 200 }} />
          </View>
        )}

        <Text style={styles.title}>Tenant Selection Criteria</Text>
        <Text style={styles.subtitle}>
          {criteria.name} · {jurisdictionName}
        </Text>

        {/* Income & credit */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Income &amp; credit</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Monthly income required</Text>
            <Text style={styles.fieldValue}>
              {criteria.income_multiple
                ? `At least ${criteria.income_multiple}x the monthly rent`
                : 'Not specified'}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Minimum credit score</Text>
            <Text style={styles.fieldValue}>
              {num(criteria.min_credit_score)}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Section 8 / housing vouchers</Text>
            <Text style={styles.fieldValue}>
              {yesNo(criteria.accepts_section_8)}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Other vouchers / assistance</Text>
            <Text style={styles.fieldValue}>
              {yesNo(criteria.accepts_other_vouchers)}
            </Text>
          </View>
        </View>

        {/* Rental + eviction history */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Rental + eviction history</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Eviction lookback window</Text>
            <Text style={styles.fieldValue}>
              {num(criteria.max_evictions_lookback_years, ' years')}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Maximum prior evictions</Text>
            <Text style={styles.fieldValue}>{num(criteria.max_eviction_count)}</Text>
          </View>
        </View>

        {/* Criminal history */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Criminal history</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Lookback window</Text>
            <Text style={styles.fieldValue}>
              {num(criteria.criminal_history_lookback_years, ' years')}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Excluded categories</Text>
            <Text style={styles.fieldValue}>
              {listOrNot(criteria.criminal_history_excludes)}
            </Text>
          </View>
          <Text style={[styles.paragraph, { fontSize: 9, color: '#6b7280' }]}>
            Criminal history is considered on a case-by-case basis after a
            conditional offer, with individualized assessment of the nature,
            severity, and recency of any conviction. Arrest records are not
            considered.
          </Text>
        </View>

        {/* Pets + occupancy */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Pets &amp; occupancy</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Pet policy</Text>
            <Text style={styles.fieldValue}>
              {criteria.pet_policy ?? 'Not specified'}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Occupancy maximum</Text>
            <Text style={styles.fieldValue}>
              {num(criteria.occupancy_max_per_bedroom, ' per bedroom (HUD baseline)')}
            </Text>
          </View>
          <Text style={[styles.paragraph, { fontSize: 9, color: '#6b7280' }]}>
            Service animals and emotional support animals are not subject to
            this pet policy.
          </Text>
        </View>

        {/* Additional requirements */}
        {criteria.additional_requirements && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Additional requirements</Text>
            <Text style={styles.paragraph}>
              {criteria.additional_requirements}
            </Text>
          </View>
        )}

        {/* Reasonable accommodations */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Reasonable accommodations</Text>
          <Text style={styles.paragraph}>
            {criteria.reasonable_accommodations_statement ||
              DEFAULT_REASONABLE_ACCOMMODATIONS}
          </Text>
        </View>

        {/* Disclosure block */}
        <View style={styles.disclosureBlock}>
          <Text style={styles.disclosureTitle}>Fair-housing disclosure</Text>
          <Text style={styles.disclosureText}>
            This housing provider applies the criteria above to every
            applicant equally. The provider does not discriminate on the
            basis of race, color, religion, sex, national origin, familial
            status, disability, or any class protected by applicable
            federal, state, or local law. Income from any legal source — wage
            employment, self-employment, Social Security, disability,
            housing vouchers, retirement, public assistance, child support,
            or other lawful sources — is treated equally for purposes of the
            income requirement above. Reasonable accommodations are
            available upon request.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {criteria.name} · v{version} · {jurisdictionName} · Generated{' '}
            {formatDate(generatedOn)} · {landlordName}
          </Text>
          {(formattedAddress || contactLine) && (
            <Text style={{ marginTop: 2 }}>
              {[formattedAddress, contactLine].filter(Boolean).join(' · ')}
            </Text>
          )}
          <Text style={{ marginTop: 2 }}>
            Generated by Rentbase. Not legal advice. Have your specific
            jurisdiction reviewed by a licensed attorney.
          </Text>
        </View>
      </Page>
    </Document>
  )
}

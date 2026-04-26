// ============================================================
// InspectionPdf — React-PDF template for a printed inspection
// ============================================================
//
// One-to-many-page PDF of an inspection. Header block has lease
// context + inspection metadata + signatures. Body lists every
// item grouped by room with condition, notes, and up to 4
// photo thumbnails per item.
//
// Photos are pre-resolved to signed URLs upstream in the route
// handler so React-PDF can fetch them without RLS friction.

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import {
  ITEM_CONDITION_LABELS,
  INSPECTION_TYPE_LABELS,
  INSPECTION_STATUS_LABELS,
} from '@/app/lib/schemas/inspection'
import type {
  InspectionItem,
  ItemCondition,
  InspectionType,
  InspectionStatus,
} from '@/app/lib/schemas/inspection'

const COND_COLORS: Record<ItemCondition, { bg: string; text: string }> = {
  excellent: { bg: '#d1fae5', text: '#065f46' },
  good: { bg: '#ecfdf5', text: '#047857' },
  fair: { bg: '#fef3c7', text: '#92400e' },
  poor: { bg: '#ffedd5', text: '#9a3412' },
  damaged: { bg: '#fee2e2', text: '#991b1b' },
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#111827',
  },
  header: {
    marginBottom: 16,
    paddingBottom: 10,
    borderBottom: '2pt solid #4f46e5',
  },
  logo: { fontSize: 16, fontWeight: 'bold', color: '#4f46e5' },
  title: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  subtitle: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  metaGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaCard: {
    width: '48%',
    padding: 8,
    borderRadius: 4,
    border: '1pt solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: { fontSize: 10, marginTop: 2 },
  notesBlock: {
    marginTop: 10,
    padding: 8,
    borderRadius: 4,
    border: '1pt solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  section: { marginTop: 14 },
  roomTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    padding: 5,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemRow: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: '0.5pt solid #e5e7eb',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: { fontSize: 10, fontWeight: 'bold' },
  condBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 8,
    fontWeight: 'bold',
  },
  notes: {
    marginTop: 3,
    fontSize: 9,
    color: '#4b5563',
  },
  photoRow: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  photo: {
    width: 80,
    height: 80,
    objectFit: 'cover',
    borderRadius: 3,
    border: '0.5pt solid #d1d5db',
  },
  signatureRow: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 12,
  },
  signatureBox: {
    flex: 1,
    padding: 10,
    borderRadius: 4,
    border: '1pt solid #d1d5db',
  },
  signatureLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  signatureName: { fontSize: 11, marginTop: 4, fontWeight: 'bold' },
  signatureDate: { fontSize: 9, color: '#6b7280', marginTop: 2 },
  signaturePending: { fontSize: 9, color: '#9ca3af', fontStyle: 'italic' },
  footer: {
    marginTop: 16,
    paddingTop: 8,
    borderTop: '1pt solid #e5e7eb',
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
  },
})

export type InspectionPdfProps = {
  inspection: {
    id: string
    type: InspectionType
    status: InspectionStatus
    scheduled_for: string | null
    completed_at: string | null
    tenant_signed_at: string | null
    tenant_signature_name: string | null
    landlord_signed_at: string | null
    landlord_signature_name: string | null
    notes: string | null
    created_at: string
  }
  items: InspectionItem[]
  context: {
    propertyName: string
    unitLabel: string
    tenantName: string
    leaseStart: string
    leaseEnd: string
    landlordName?: string | null
    logoUrl?: string | null
  }
  // Maps a storage-path string to its resolved signed URL. Paths
  // not found in this map are skipped (no image).
  photoUrls: Record<string, string>
  generatedOn: string
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US')
}

function groupByRoom(items: InspectionItem[]): Map<string, InspectionItem[]> {
  const map = new Map<string, InspectionItem[]>()
  for (const it of items) {
    const existing = map.get(it.room) ?? []
    existing.push(it)
    map.set(it.room, existing)
  }
  return map
}

const MAX_PHOTOS_PER_ITEM = 4

export function InspectionPdf({
  inspection,
  items,
  context,
  photoUrls,
  generatedOn,
}: InspectionPdfProps) {
  const grouped = groupByRoom(items)
  const rooms = Array.from(grouped.keys()).sort((a, b) => {
    const aMin = Math.min(...(grouped.get(a) ?? []).map((i) => i.sort_order))
    const bMin = Math.min(...(grouped.get(b) ?? []).map((i) => i.sort_order))
    return aMin - bMin
  })

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {context.logoUrl ? (
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image */}
              <Image
                src={context.logoUrl}
                style={{ maxHeight: 40, maxWidth: 160 }}
              />
            </View>
          ) : null}
          <Text style={styles.logo}>{context.landlordName || 'Rentapp'}</Text>
          <Text style={styles.title}>
            {INSPECTION_TYPE_LABELS[inspection.type]} Inspection
          </Text>
          <Text style={styles.subtitle}>
            {context.propertyName} · {context.unitLabel} · Tenant:{' '}
            {context.tenantName}
          </Text>
          <Text style={styles.subtitle}>
            Lease term: {formatDate(context.leaseStart)} —{' '}
            {formatDate(context.leaseEnd)}
          </Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={styles.metaValue}>
                {INSPECTION_STATUS_LABELS[inspection.status]}
              </Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Scheduled</Text>
              <Text style={styles.metaValue}>
                {formatDate(inspection.scheduled_for)}
              </Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Completed</Text>
              <Text style={styles.metaValue}>
                {formatDateTime(inspection.completed_at)}
              </Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Items rated</Text>
              <Text style={styles.metaValue}>
                {items.filter((i) => i.condition !== null).length} of{' '}
                {items.length}
              </Text>
            </View>
          </View>

          {inspection.notes && (
            <View style={styles.notesBlock}>
              <Text style={styles.metaLabel}>Overall notes</Text>
              <Text style={{ ...styles.metaValue, marginTop: 3 }}>
                {inspection.notes}
              </Text>
            </View>
          )}
        </View>

        {/* Items grouped by room */}
        {rooms.map((room) => {
          const roomItems = (grouped.get(room) ?? []).sort(
            (a, b) => a.sort_order - b.sort_order,
          )
          return (
            <View key={room} style={styles.section} wrap={true}>
              <Text style={styles.roomTitle}>{room}</Text>
              {roomItems.map((item) => {
                const cond = item.condition
                const colors = cond ? COND_COLORS[cond] : null
                const photosToShow = item.photos
                  .map((p) => photoUrls[p])
                  .filter((u): u is string => !!u)
                  .slice(0, MAX_PHOTOS_PER_ITEM)
                const extraPhotos =
                  item.photos.length > MAX_PHOTOS_PER_ITEM
                    ? item.photos.length - MAX_PHOTOS_PER_ITEM
                    : 0
                return (
                  <View key={item.id} style={styles.itemRow} wrap={false}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemName}>{item.item}</Text>
                      {cond && colors ? (
                        <Text
                          style={{
                            ...styles.condBadge,
                            backgroundColor: colors.bg,
                            color: colors.text,
                          }}
                        >
                          {ITEM_CONDITION_LABELS[cond]}
                        </Text>
                      ) : (
                        <Text
                          style={{
                            ...styles.condBadge,
                            backgroundColor: '#f3f4f6',
                            color: '#6b7280',
                          }}
                        >
                          Not rated
                        </Text>
                      )}
                    </View>
                    {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
                    {photosToShow.length > 0 && (
                      <View style={styles.photoRow}>
                        {photosToShow.map((url, idx) => (
                          // eslint-disable-next-line jsx-a11y/alt-text
                          <Image key={idx} src={url} style={styles.photo} />
                        ))}
                        {extraPhotos > 0 && (
                          <Text
                            style={{
                              fontSize: 9,
                              color: '#6b7280',
                              alignSelf: 'center',
                            }}
                          >
                            +{extraPhotos} more
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )
        })}

        {/* Signatures */}
        <View style={styles.signatureRow} wrap={false}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Landlord signature</Text>
            {inspection.landlord_signed_at ? (
              <>
                <Text style={styles.signatureName}>
                  {inspection.landlord_signature_name ?? '—'}
                </Text>
                <Text style={styles.signatureDate}>
                  Signed {formatDateTime(inspection.landlord_signed_at)}
                </Text>
              </>
            ) : (
              <Text style={styles.signaturePending}>Not signed yet</Text>
            )}
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Tenant signature</Text>
            {inspection.tenant_signed_at ? (
              <>
                <Text style={styles.signatureName}>
                  {inspection.tenant_signature_name ?? '—'}
                </Text>
                <Text style={styles.signatureDate}>
                  Signed {formatDateTime(inspection.tenant_signed_at)}
                </Text>
              </>
            ) : (
              <Text style={styles.signaturePending}>Not signed yet</Text>
            )}
          </View>
        </View>

        <Text style={styles.footer}>
          Generated {generatedOn} · Inspection ID {inspection.id.slice(0, 8)}
        </Text>
      </Page>
    </Document>
  )
}

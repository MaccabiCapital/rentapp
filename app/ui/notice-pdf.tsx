// ============================================================
// NoticePdf — React-PDF template for state legal notices
// ============================================================
//
// Generates a one-to-two page notice letter with:
//   - Yellow DRAFT banner (attorney review required)
//   - Address block (landlord + tenant + property)
//   - Notice-specific body text
//   - Signature line
//   - Footer with state-rule citation when relevant
//
// THIS IS NOT LEGAL ADVICE. The generated PDF is intended as a
// starting draft for an attorney to review and finalize.

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import {
  NOTICE_TYPE_LABELS,
  ENTRY_REASON_LABELS,
  TERMINATE_REASON_LABELS,
  type NoticeType,
  type RentIncreaseData,
  type EntryData,
  type LateRentData,
  type CureOrQuitData,
  type TerminateTenancyData,
  type MoveOutInfoData,
  type EntryReason,
  type TerminateReason,
} from '@/app/lib/schemas/notice'

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
  senderBlock: { marginBottom: 20 },
  senderLine: { fontSize: 10 },
  dateLine: { marginTop: 14, fontSize: 10 },
  addressBlock: { marginTop: 20 },
  addressLabel: {
    fontSize: 9,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  addressLine: { fontSize: 10 },
  reLine: { marginTop: 20, fontSize: 10, fontWeight: 'bold' },
  title: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  body: { marginTop: 20 },
  paragraph: {
    marginBottom: 10,
    fontSize: 11,
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  emphasis: { fontWeight: 'bold' },
  dataTable: {
    marginTop: 10,
    marginBottom: 10,
    border: '1pt solid #d1d5db',
    borderRadius: 4,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #e5e7eb',
    padding: 6,
  },
  dataRowLast: {
    flexDirection: 'row',
    padding: 6,
  },
  dataLabel: { width: '40%', fontSize: 10, color: '#4b5563' },
  dataValue: { width: '60%', fontSize: 10, fontWeight: 'bold' },
  signatureBlock: { marginTop: 40 },
  signatureLine: {
    borderTop: '1pt solid #111827',
    marginTop: 40,
    paddingTop: 4,
    fontSize: 10,
    width: '60%',
  },
  footer: {
    marginTop: 30,
    paddingTop: 8,
    borderTop: '1pt solid #e5e7eb',
    fontSize: 8,
    color: '#6b7280',
    lineHeight: 1.4,
  },
})

function formatUSD(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(n))
}

function formatDateLong(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''))
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime24to12(hhmm: string | null | undefined): string {
  if (!hhmm) return '—'
  const [h, m] = hhmm.split(':').map((x) => Number(x))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  const mm = String(m).padStart(2, '0')
  return `${hour12}:${mm} ${period}`
}

export type NoticePdfProps = {
  type: NoticeType
  data: unknown
  generatedOn: string
  noticeIdShort: string
  landlord: {
    name: string
  }
  tenant: {
    name: string
  }
  property: {
    name: string
    street_address: string | null
    unit_label: string | null
    city: string | null
    state: string | null
    postal_code: string | null
  }
  stateRules: {
    increase_notice_days: number | null
    no_cause_termination_notice_days: number | null
    eviction_cure_period_days: number | null
    late_fee_grace_days_min: number | null
  } | null
}

function propertyAddressLines(
  property: NoticePdfProps['property'],
): string[] {
  const lines: string[] = []
  const addrLine = [property.street_address, property.unit_label]
    .filter(Boolean)
    .join(', ')
  if (addrLine) lines.push(addrLine)
  const cityLine = [property.city, property.state, property.postal_code]
    .filter(Boolean)
    .join(', ')
    .replace(/, (\w{2}), /, ', $1 ')
  if (cityLine) lines.push(cityLine)
  return lines
}

export function NoticePdf(props: NoticePdfProps) {
  const { type, data, generatedOn, noticeIdShort, landlord, tenant, property, stateRules } =
    props

  const addressLines = propertyAddressLines(property)

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* DRAFT disclaimer — on every notice */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>
            DRAFT — attorney review required
          </Text>
          <Text style={styles.disclaimerText}>
            This notice was generated from a template. Before serving, have it
            reviewed by an attorney licensed in {property.state ?? 'your state'}
            . State and local laws vary on required notice days, delivery
            methods, and content. Rentbase is not a law firm and does not
            provide legal advice.
          </Text>
        </View>

        {/* Sender block — landlord name & property */}
        <View style={styles.senderBlock}>
          <Text style={styles.senderLine}>{landlord.name}</Text>
          <Text style={styles.senderLine}>Landlord / Property Manager</Text>
        </View>

        <Text style={styles.dateLine}>{formatDateLong(generatedOn)}</Text>

        {/* Tenant address block */}
        <View style={styles.addressBlock}>
          <Text style={styles.addressLabel}>To:</Text>
          <Text style={styles.addressLine}>{tenant.name}</Text>
          {addressLines.map((l, i) => (
            <Text key={i} style={styles.addressLine}>
              {l}
            </Text>
          ))}
        </View>

        <Text style={styles.reLine}>
          RE: {NOTICE_TYPE_LABELS[type]} — {property.name}
        </Text>

        {/* Title */}
        <Text style={styles.title}>{NOTICE_TYPE_LABELS[type]}</Text>

        {/* Body — type-specific */}
        <View style={styles.body}>
          {type === 'rent_increase' && (
            <RentIncreaseBody
              data={data as RentIncreaseData}
              property={property}
              stateNoticeDays={stateRules?.increase_notice_days ?? null}
            />
          )}
          {type === 'entry' && (
            <EntryBody data={data as EntryData} property={property} />
          )}
          {type === 'late_rent' && (
            <LateRentBody data={data as LateRentData} property={property} />
          )}
          {type === 'cure_or_quit' && (
            <CureOrQuitBody
              data={data as CureOrQuitData}
              property={property}
              stateCureDays={stateRules?.eviction_cure_period_days ?? null}
            />
          )}
          {type === 'terminate_tenancy' && (
            <TerminateTenancyBody
              data={data as TerminateTenancyData}
              property={property}
              stateTerminationDays={
                stateRules?.no_cause_termination_notice_days ?? null
              }
            />
          )}
          {type === 'move_out_info' && (
            <MoveOutInfoBody
              data={data as MoveOutInfoData}
              property={property}
            />
          )}
        </View>

        {/* Signature */}
        <View style={styles.signatureBlock}>
          <Text style={styles.paragraph}>Sincerely,</Text>
          <View style={styles.signatureLine}>
            <Text>{landlord.name}</Text>
          </View>
          <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>
            Landlord / Authorized agent
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Notice ID {noticeIdShort} · Generated {formatDateLong(generatedOn)}
          {'\n'}
          Draft only — not legal advice. Verify state-specific notice
          requirements with a licensed attorney before serving.
        </Text>
      </Page>
    </Document>
  )
}

// ------------------------------------------------------------
// Body templates per notice type
// ------------------------------------------------------------

function RentIncreaseBody({
  data,
  property,
  stateNoticeDays,
}: {
  data: RentIncreaseData
  property: NoticePdfProps['property']
  stateNoticeDays: number | null
}) {
  return (
    <>
      <Text style={styles.paragraph}>
        This letter is to inform you that the monthly rent for the premises
        located at {property.street_address ?? property.name}
        {property.unit_label ? `, ${property.unit_label}` : ''}, {property.city ?? ''}{property.state ? `, ${property.state}` : ''}
        {property.postal_code ? ` ${property.postal_code}` : ''} will be
        increased effective{' '}
        <Text style={styles.emphasis}>
          {formatDateLong(data.effective_date)}
        </Text>
        .
      </Text>

      <View style={styles.dataTable}>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Current monthly rent</Text>
          <Text style={styles.dataValue}>
            {formatUSD(data.current_monthly_rent)}
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>New monthly rent</Text>
          <Text style={styles.dataValue}>{formatUSD(data.new_monthly_rent)}</Text>
        </View>
        <View style={styles.dataRowLast}>
          <Text style={styles.dataLabel}>Effective date</Text>
          <Text style={styles.dataValue}>
            {formatDateLong(data.effective_date)}
          </Text>
        </View>
      </View>

      {data.reason && (
        <Text style={styles.paragraph}>Reason: {data.reason}</Text>
      )}

      <Text style={styles.paragraph}>
        Please make the adjusted payment beginning with your rent due on or
        after the effective date above. All other terms of the lease remain
        unchanged.
      </Text>

      {stateNoticeDays !== null && (
        <Text style={styles.paragraph}>
          {property.state ?? 'Your state'} requires at least {stateNoticeDays}{' '}
          days&rsquo; advance written notice of any rent increase. This notice
          is being provided in accordance with that requirement. Confirm with
          your attorney that the timing satisfies applicable state and local
          law.
        </Text>
      )}

      <Text style={styles.paragraph}>
        If you have questions about this notice or would like to discuss the
        terms, please contact me at your earliest convenience.
      </Text>
    </>
  )
}

function EntryBody({
  data,
  property,
}: {
  data: EntryData
  property: NoticePdfProps['property']
}) {
  return (
    <>
      <Text style={styles.paragraph}>
        This letter serves as advance notice that the landlord or an
        authorized agent intends to enter the premises at{' '}
        {property.street_address ?? property.name}
        {property.unit_label ? `, ${property.unit_label}` : ''}.
      </Text>

      <View style={styles.dataTable}>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Date of entry</Text>
          <Text style={styles.dataValue}>
            {formatDateLong(data.entry_date)}
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Window</Text>
          <Text style={styles.dataValue}>
            {formatTime24to12(data.entry_time_start)} –{' '}
            {formatTime24to12(data.entry_time_end)}
          </Text>
        </View>
        <View style={styles.dataRowLast}>
          <Text style={styles.dataLabel}>Reason</Text>
          <Text style={styles.dataValue}>
            {ENTRY_REASON_LABELS[data.reason as EntryReason]}
          </Text>
        </View>
      </View>

      {data.details && (
        <Text style={styles.paragraph}>Additional details: {data.details}</Text>
      )}

      <Text style={styles.paragraph}>
        Most states require that a landlord provide at least 24 to 48
        hours&rsquo; advance notice before entering an occupied unit for
        non-emergency purposes, and that entry occur at reasonable times.
        Please be home or make arrangements to provide access during the
        window above. If this time is inconvenient, please contact me and we
        will arrange an alternative.
      </Text>

      <Text style={styles.paragraph}>
        Nothing will be disturbed beyond what is necessary to accomplish the
        stated purpose.
      </Text>
    </>
  )
}

function LateRentBody({
  data,
  property,
}: {
  data: LateRentData
  property: NoticePdfProps['property']
}) {
  return (
    <>
      <Text style={styles.paragraph}>
        This is a reminder that rent for the premises at{' '}
        {property.street_address ?? property.name}
        {property.unit_label ? `, ${property.unit_label}` : ''}{' '}
        has not been received and is now past due.
      </Text>

      <View style={styles.dataTable}>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Original due date</Text>
          <Text style={styles.dataValue}>
            {formatDateLong(data.original_due_date)}
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Rent amount</Text>
          <Text style={styles.dataValue}>{formatUSD(data.amount_due)}</Text>
        </View>
        {data.late_fee !== undefined && data.late_fee > 0 && (
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Late fee</Text>
            <Text style={styles.dataValue}>{formatUSD(data.late_fee)}</Text>
          </View>
        )}
        <View style={styles.dataRowLast}>
          <Text style={styles.dataLabel}>Total now owed</Text>
          <Text style={styles.dataValue}>{formatUSD(data.total_owed)}</Text>
        </View>
      </View>

      <Text style={styles.paragraph}>
        Please remit the total owed as soon as possible. If payment has
        already been sent, please disregard this notice and confirm the
        delivery method so I can locate it.
      </Text>

      <Text style={styles.paragraph}>
        Continued non-payment may result in the issuance of a formal pay-or-
        quit notice and eviction proceedings. Please contact me if you are
        experiencing a temporary hardship so we can discuss options before
        the situation escalates.
      </Text>
    </>
  )
}

function CureOrQuitBody({
  data,
  property,
  stateCureDays,
}: {
  data: CureOrQuitData
  property: NoticePdfProps['property']
  stateCureDays: number | null
}) {
  return (
    <>
      <Text style={styles.paragraph}>
        You are hereby notified that rent in the amount of{' '}
        <Text style={styles.emphasis}>{formatUSD(data.amount_due)}</Text> is
        now due and unpaid for the premises at{' '}
        {property.street_address ?? property.name}
        {property.unit_label ? `, ${property.unit_label}` : ''}.
      </Text>

      <Text style={styles.paragraph}>
        You are required to either:
      </Text>

      <Text style={styles.paragraph}>
        &nbsp;&nbsp;(1) pay the full amount of{' '}
        <Text style={styles.emphasis}>{formatUSD(data.amount_due)}</Text> by{' '}
        <Text style={styles.emphasis}>
          {formatDateLong(data.cure_deadline_date)}
        </Text>
        , OR
      </Text>

      <Text style={styles.paragraph}>
        &nbsp;&nbsp;(2) vacate and surrender possession of the premises on or
        before the same date.
      </Text>

      <Text style={styles.paragraph}>
        Failure to do one of the above by the deadline may result in the
        commencement of legal proceedings to recover possession of the
        premises, unpaid rent, damages, court costs, and attorneys&rsquo;
        fees as permitted by law.
      </Text>

      {stateCureDays !== null && (
        <Text style={styles.paragraph}>
          {property.state ?? 'Your state'} provides a statutory cure period
          of approximately {stateCureDays} days for non-payment of rent.
          Confirm with your attorney that the cure deadline above satisfies
          the notice requirements in the property&rsquo;s jurisdiction.
        </Text>
      )}

      <Text style={styles.paragraph}>
        Nothing in this notice shall be construed as a waiver of any of the
        landlord&rsquo;s rights or remedies under the lease or applicable
        law.
      </Text>
    </>
  )
}

function TerminateTenancyBody({
  data,
  property,
  stateTerminationDays,
}: {
  data: TerminateTenancyData
  property: NoticePdfProps['property']
  stateTerminationDays: number | null
}) {
  return (
    <>
      <Text style={styles.paragraph}>
        You are hereby notified that the tenancy for the premises at{' '}
        {property.street_address ?? property.name}
        {property.unit_label ? `, ${property.unit_label}` : ''} shall
        terminate on{' '}
        <Text style={styles.emphasis}>
          {formatDateLong(data.termination_date)}
        </Text>
        .
      </Text>

      <View style={styles.dataTable}>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Reason</Text>
          <Text style={styles.dataValue}>
            {TERMINATE_REASON_LABELS[data.reason as TerminateReason]}
          </Text>
        </View>
        <View style={styles.dataRowLast}>
          <Text style={styles.dataLabel}>Termination date</Text>
          <Text style={styles.dataValue}>
            {formatDateLong(data.termination_date)}
          </Text>
        </View>
      </View>

      {data.details && (
        <Text style={styles.paragraph}>Additional details: {data.details}</Text>
      )}

      <Text style={styles.paragraph}>
        You are expected to vacate the premises and surrender possession on
        or before the termination date above. Please contact me to schedule
        a move-out inspection and the return of any keys, remotes, and
        building access devices.
      </Text>

      {stateTerminationDays !== null && (
        <Text style={styles.paragraph}>
          {property.state ?? 'Your state'} requires at least{' '}
          {stateTerminationDays} days&rsquo; written notice to terminate
          tenancy without cause. Confirm with your attorney that this notice
          satisfies the applicable state and local notice period, as well as
          any additional grounds-for-termination requirements.
        </Text>
      )}

      <Text style={styles.paragraph}>
        Information about the return of your security deposit will be
        provided separately in accordance with applicable state law.
      </Text>
    </>
  )
}

function MoveOutInfoBody({
  data,
  property,
}: {
  data: MoveOutInfoData
  property: NoticePdfProps['property']
}) {
  return (
    <>
      <Text style={styles.paragraph}>
        Thank you for your notice to vacate the premises at{' '}
        {property.street_address ?? property.name}
        {property.unit_label ? `, ${property.unit_label}` : ''}. This
        information packet covers what happens during your notice period and
        on your move-out day. Please read it carefully and get in touch if
        anything is unclear.
      </Text>

      <View style={styles.dataTable}>
        <View style={styles.dataRowLast}>
          <Text style={styles.dataLabel}>Anticipated move-out date</Text>
          <Text style={styles.dataValue}>
            {formatDateLong(data.anticipated_move_out_date)}
          </Text>
        </View>
      </View>

      <Text
        style={{
          marginTop: 16,
          marginBottom: 6,
          fontSize: 12,
          fontWeight: 'bold',
          color: '#111827',
        }}
      >
        1. Showings during your notice period
      </Text>
      <Text style={styles.paragraph}>
        As permitted by the lease and applicable state law, we will show the
        unit to prospective tenants during your notice period. You will
        receive at least{' '}
        <Text style={styles.emphasis}>
          {data.showing_notice_hours} hours&rsquo; advance notice
        </Text>{' '}
        of any showing. We will coordinate times that minimize disruption to
        you.
      </Text>
      {data.showings_policy && (
        <Text style={styles.paragraph}>{data.showings_policy}</Text>
      )}

      <Text
        style={{
          marginTop: 16,
          marginBottom: 6,
          fontSize: 12,
          fontWeight: 'bold',
          color: '#111827',
        }}
      >
        2. Move-out day
      </Text>
      {data.move_out_day_instructions ? (
        <Text style={styles.paragraph}>{data.move_out_day_instructions}</Text>
      ) : (
        <Text style={styles.paragraph}>
          On your move-out day, please leave the unit broom-clean and empty
          of personal belongings, trash, and food. A move-out inspection will
          be conducted on the same day or the following business day.
        </Text>
      )}
      {data.elevator_or_dock_booking && (
        <Text style={styles.paragraph}>
          <Text style={styles.emphasis}>Elevator / loading dock: </Text>
          {data.elevator_or_dock_booking}
        </Text>
      )}
      {data.keys_return_instructions && (
        <Text style={styles.paragraph}>
          <Text style={styles.emphasis}>Keys + fobs: </Text>
          {data.keys_return_instructions}
        </Text>
      )}

      <Text
        style={{
          marginTop: 16,
          marginBottom: 6,
          fontSize: 12,
          fontWeight: 'bold',
          color: '#111827',
        }}
      >
        3. Security deposit return
      </Text>
      <Text style={styles.paragraph}>
        Your security deposit will be returned within the time frame required
        by {property.state ?? 'your state'}&rsquo;s law, less any lawful
        deductions for unpaid rent or damage beyond normal wear and tear.
        You will receive an itemized accounting of any deductions.
      </Text>
      {data.forwarding_address_request && (
        <Text style={styles.paragraph}>
          <Text style={styles.emphasis}>
            Please provide a forwarding address
          </Text>{' '}
          in writing before your move-out day so we can mail your deposit
          accounting and any refund owed.
        </Text>
      )}

      <Text
        style={{
          marginTop: 16,
          marginBottom: 6,
          fontSize: 12,
          fontWeight: 'bold',
          color: '#111827',
        }}
      >
        4. Utilities + services
      </Text>
      {data.utility_transfer_note ? (
        <Text style={styles.paragraph}>{data.utility_transfer_note}</Text>
      ) : (
        <Text style={styles.paragraph}>
          Please transfer all utility accounts out of your name effective
          your move-out date. Cancel or transfer your renters-insurance
          policy. Arrange mail forwarding with the postal service.
        </Text>
      )}

      <Text style={styles.paragraph}>
        If you have questions about any of the above, please reach out. We
        appreciate the clear communication as we wrap up the tenancy.
      </Text>
    </>
  )
}

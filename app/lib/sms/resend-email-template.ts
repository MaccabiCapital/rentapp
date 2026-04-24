// ============================================================
// Landlord email templates (HTML + text)
// ============================================================
//
// Drafted HTML/text for landlord notifications triggered by the
// Sprint 13 tenant support line. Reviewed before enabling the
// real Resend send call in resend-adapter.ts — once a verified
// sending domain + RESEND_API_KEY are in place.
//
// Convention: every email has a subject, a plain-text body (for
// spam-filter reputation + accessibility) and an HTML body (for
// the landlord's inbox rendering). Keep messages short; landlords
// click through to the app for anything beyond the headline.

export type AutoMaintenanceEmail = {
  subject: string
  text: string
  html: string
}

export function renderAutoMaintenanceEmail(input: {
  landlordName: string
  tenantName: string
  unitLabel: string
  severity: string
  description: string
  maintenanceUrl: string
}): AutoMaintenanceEmail {
  const severityLabel = {
    emergency: 'EMERGENCY',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    normal: 'Normal',
  }[input.severity as 'emergency' | 'high' | 'medium' | 'low' | 'normal'] ??
    input.severity

  const subject = `New maintenance request · ${input.tenantName} · ${input.unitLabel} · ${severityLabel}`

  const text = `Hi ${input.landlordName},

A new maintenance request was auto-created from your tenant support line.

  Tenant: ${input.tenantName}
  Unit: ${input.unitLabel}
  Severity: ${severityLabel}

  Description:
  ${input.description}

View + assign: ${input.maintenanceUrl}

This email was sent by Rentapp based on an incoming text / call on your support line.`

  const severityColor =
    input.severity === 'emergency'
      ? '#dc2626'
      : input.severity === 'high'
        ? '#ea580c'
        : input.severity === 'medium'
          ? '#d97706'
          : '#4b5563'

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #e4e4e7;">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;font-weight:600;">New maintenance request</div>
        <div style="margin-top:4px;font-size:18px;font-weight:600;">${escapeHtml(input.tenantName)} · ${escapeHtml(input.unitLabel)}</div>
        <div style="margin-top:6px;display:inline-block;padding:2px 8px;background:${severityColor};color:#ffffff;border-radius:999px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(severityLabel)}</div>
      </div>
      <div style="padding:20px 24px;font-size:14px;line-height:1.5;">
        <div style="margin-bottom:8px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Description</div>
        <div style="white-space:pre-wrap;">${escapeHtml(input.description)}</div>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #e4e4e7;background:#f9fafb;">
        <a href="${escapeHtml(input.maintenanceUrl)}"
           style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px;font-weight:600;">
          Open maintenance request →
        </a>
      </div>
      <div style="padding:12px 24px;border-top:1px solid #e4e4e7;background:#ffffff;color:#6b7280;font-size:11px;line-height:1.5;">
        Sent by Rentapp based on an incoming message on your tenant support line. Unsubscribe by suspending the line in Settings.
      </div>
    </div>
  </body>
</html>`

  return { subject, text, html }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ------------------------------------------------------------
// Prospect-inquiry email — from the leasing line
// ------------------------------------------------------------

export function renderAutoProspectEmail(input: {
  landlordName: string
  prospectName: string
  prospectContact: string
  propertyName: string
  unitLabel: string | null
  inquiryMessage: string
  prospectUrl: string
}): AutoMaintenanceEmail {
  const subject = `New lead · ${input.prospectName} · ${input.propertyName}${input.unitLabel ? ` · ${input.unitLabel}` : ''}`

  const text = `Hi ${input.landlordName},

A new prospect just reached out on your leasing line.

  Name: ${input.prospectName}
  Contact: ${input.prospectContact}
  Interested in: ${input.propertyName}${input.unitLabel ? ` · ${input.unitLabel}` : ''}

  What they said:
  ${input.inquiryMessage}

Open the prospect: ${input.prospectUrl}

Move them down the pipeline or reply through the Leasing Assistant.`

  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>${escapeHtml(subject)}</title></head>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #e4e4e7;">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;font-weight:600;">New prospect inquiry</div>
        <div style="margin-top:4px;font-size:18px;font-weight:600;">${escapeHtml(input.prospectName)}</div>
        <div style="margin-top:6px;font-size:13px;color:#4b5563;">${escapeHtml(input.prospectContact)}</div>
        <div style="margin-top:10px;font-size:13px;color:#374151;">Interested in <strong>${escapeHtml(input.propertyName)}${input.unitLabel ? ` · ${escapeHtml(input.unitLabel)}` : ''}</strong></div>
      </div>
      <div style="padding:20px 24px;font-size:14px;line-height:1.5;">
        <div style="margin-bottom:8px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Inquiry</div>
        <div style="white-space:pre-wrap;">${escapeHtml(input.inquiryMessage)}</div>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #e4e4e7;background:#f9fafb;">
        <a href="${escapeHtml(input.prospectUrl)}"
           style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px;font-weight:600;">
          Open prospect →
        </a>
      </div>
      <div style="padding:12px 24px;border-top:1px solid #e4e4e7;background:#ffffff;color:#6b7280;font-size:11px;line-height:1.5;">
        Sent by Rentapp based on an incoming call on your leasing line. Route through the Leasing Assistant for fair-housing-aware drafted replies.
      </div>
    </div>
  </body>
</html>`

  return { subject, text, html }
}

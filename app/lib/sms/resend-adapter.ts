// ============================================================
// Resend adapter — STUBBED
// ============================================================
//
// Landlord notifications when the Retell pipeline auto-creates a
// maintenance request. Swap to real Resend SDK once we have a
// verified sending domain. See docs/SPRINT-13-NEEDS.md §4.

export type AutoMaintenanceEmailInput = {
  to: string
  landlordName: string
  tenantName: string
  unitLabel: string
  severity: string
  description: string
  maintenanceUrl: string
}

export async function sendAutoMaintenanceNotification(
  input: AutoMaintenanceEmailInput,
): Promise<{ message_id: string }> {
  // TODO(sprint-13): swap for real Resend call —
  // see SPRINT-13-NEEDS.md#4-resend-or-postmark-for-landlord-notifications
  console.warn(
    '[SPRINT-13 STUB] sendAutoMaintenanceNotification',
    JSON.stringify({
      to: input.to,
      subject: `New maintenance request from ${input.tenantName} (${input.unitLabel})`,
      severity: input.severity,
      descriptionPreview: input.description.slice(0, 120),
    }),
  )
  return { message_id: `stub_email_${Date.now()}` }
}

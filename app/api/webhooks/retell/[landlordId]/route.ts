// ============================================================
// Retell webhook route — tenant SMS → maintenance request
// ============================================================
//
// THIS IS AN UNAUTHENTICATED ROUTE. It's signed by Retell and
// keyed by landlordId (which is encoded in the URL path when the
// landlord provisions their support line). Every write goes
// through the service role client because there's no user
// session on a webhook request.
//
// Protections in place:
//   - HMAC signature verification (per-landlord secret)
//   - URL param must match a real landlord_phone_lines row
//   - payload parsed through Zod discriminated union
//   - media fetched only from SSRF allowlist (sms-media.ts)
//   - idempotency via retell_webhook_events unique index
//
// See docs/SPRINT-13-NEEDS.md for known-unverified assumptions
// (signature format, payload shape, media CDN hostname).

import { NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role'
import { verifyRetellSignature } from '@/app/lib/sms/verify-signature'
import {
  RetellWebhookEventSchema,
  type RetellChatAnalyzed,
  type RetellMessage,
} from '@/app/lib/sms/retell-payload'
import { downloadRemoteMedia } from '@/app/lib/storage/sms-media'
import { getPhoneLineForWebhook } from '@/app/lib/queries/phone-lines'
import { findTenantByPhoneForWebhook } from '@/app/lib/queries/sms-identities'
import { normalizeToE164 } from '@/app/lib/phone'
import { PHOTO_BUCKET } from '@/app/lib/storage/photos'
import { sendAutoMaintenanceNotification } from '@/app/lib/sms/resend-adapter'

export const runtime = 'nodejs'

const URGENCY_MAP: Record<string, string> = {
  emergency: 'emergency',
  high: 'high',
  medium: 'normal',
  low: 'low',
}

export async function POST(
  request: Request,
  context: { params: Promise<{ landlordId: string }> },
) {
  const { landlordId } = await context.params

  // Raw body first — HMAC needs the exact bytes.
  const rawBody = await request.text()

  const supabase = getServiceRoleClient()

  // 1. Resolve the landlord's support line.
  const phoneLine = await getPhoneLineForWebhook(
    supabase,
    landlordId,
    'support',
  )
  if (!phoneLine || phoneLine.status === 'suspended') {
    return NextResponse.json({ error: 'unknown line' }, { status: 404 })
  }

  // 2. Verify signature.
  const signatureHeader =
    request.headers.get('x-retell-signature') ??
    request.headers.get('retell-signature') ??
    request.headers.get('x-signature')
  const signatureOk = verifyRetellSignature(
    rawBody,
    signatureHeader,
    phoneLine.retell_webhook_secret,
  )
  if (!signatureOk) {
    return NextResponse.json({ error: 'bad signature' }, { status: 401 })
  }

  // 3. Parse payload.
  let json: unknown
  try {
    json = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }
  const parsed = RetellWebhookEventSchema.safeParse(json)
  if (!parsed.success) {
    // Log and 200 — we don't want Retell retrying an unparseable payload.
    console.warn('[retell-webhook] parse failed', parsed.error.message)
    return NextResponse.json({ ok: true, warning: 'schema mismatch' })
  }
  const event = parsed.data

  // 4. Idempotency insert. On conflict → already processed, exit.
  const { data: inserted, error: insErr } = await supabase
    .from('retell_webhook_events')
    .insert({
      owner_id: landlordId,
      event_type: event.event,
      external_id: event.chat_id,
      payload: json,
    })
    .select('id')
    .maybeSingle()
  if (insErr) {
    // Most likely the unique-index violation. Treat as already-handled.
    return NextResponse.json({ ok: true, duplicate: true })
  }
  if (!inserted) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  // 5. Side effects per event type.
  try {
    if (event.event === 'chat_started') {
      await handleChatStarted(supabase, landlordId, event)
    } else if (event.event === 'chat_analyzed') {
      await handleChatAnalyzed(supabase, landlordId, event)
    }
    // chat_ended is effectively superseded by chat_analyzed which
    // carries the transcript AND the extracted fields.

    await supabase
      .from('retell_webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', inserted.id)
  } catch (err) {
    const msg = (err as Error).message
    console.error('[retell-webhook] handler error', msg)
    await supabase
      .from('retell_webhook_events')
      .update({ process_error: msg })
      .eq('id', inserted.id)
    // Still 200 so Retell doesn't retry-storm a broken handler.
    return NextResponse.json({ ok: true, error: msg })
  }

  return NextResponse.json({ ok: true })
}

// ------------------------------------------------------------
// Handlers
// ------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleChatStarted(supabase: any, ownerId: string, event: {
  chat_id: string
  from_number: string
  initial_message?: string
}) {
  const e164 = normalizeToE164(event.from_number)
  if (!e164) return

  const resolved = await findTenantByPhoneForWebhook(supabase, ownerId, e164)

  const entityType = resolved ? 'tenant' : 'triage'
  const entityId = resolved ? resolved.tenant_id : ownerId

  await supabase.from('communications').insert({
    owner_id: ownerId,
    entity_type: entityType,
    entity_id: entityId,
    direction: 'inbound',
    channel: 'sms',
    content: event.initial_message?.trim() || '[started SMS conversation]',
    external_id: event.chat_id,
    metadata: {
      from_number: e164,
      stage: 'chat_started',
    },
    created_by: 'webhook',
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleChatAnalyzed(supabase: any, ownerId: string, event: RetellChatAnalyzed) {
  const e164 = normalizeToE164(event.from_number)
  if (!e164) return

  // --- 1. Resolve tenant ---------------------------------------
  const resolved = await findTenantByPhoneForWebhook(supabase, ownerId, e164)

  // --- 2. Log the full transcript on the right entity ----------
  const transcript = transcriptToText(event.messages)
  await supabase.from('communications').insert({
    owner_id: ownerId,
    entity_type: resolved ? 'tenant' : 'triage',
    entity_id: resolved ? resolved.tenant_id : ownerId,
    direction: 'inbound',
    channel: 'sms',
    content: transcript || '[empty transcript]',
    external_id: event.chat_id,
    metadata: {
      from_number: e164,
      stage: 'chat_analyzed',
      analysis: event.post_chat_analysis_data ?? null,
    },
    created_by: 'webhook',
  })

  if (!resolved) {
    // Unknown tenant → stay in triage; don't create a maintenance
    // request, don't notify the landlord with fake details.
    return
  }

  // --- 3. Resolve unit from the tenant's active lease ----------
  const { data: lease } = await supabase
    .from('leases')
    .select('unit_id')
    .eq('tenant_id', resolved.tenant_id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!lease) {
    // Tenant exists but has no active lease — still worth a triage
    // entry so the landlord knows about it.
    console.warn('[retell-webhook] tenant has no active lease', resolved.tenant_id)
    return
  }

  // --- 4. Build the maintenance request ------------------------
  const analysis = event.post_chat_analysis_data ?? {}
  const severity = analysis.severity ?? 'medium'
  const urgency = URGENCY_MAP[severity] ?? 'normal'
  const titleBase =
    analysis.description?.split('\n')[0]?.slice(0, 80) ??
    event.messages.find((m) => m.role === 'user')?.content.slice(0, 80) ??
    'Tenant SMS'
  const title = `[SMS] ${titleBase}`

  // --- 5. Download any MMS attachments -------------------------
  const remoteUrls: string[] = []
  for (const msg of event.messages) {
    for (const url of msg.media_urls ?? []) {
      remoteUrls.push(url)
    }
  }

  // Create the maintenance request first so we have its id for
  // the photo storage path.
  const { data: mr, error: mrErr } = await supabase
    .from('maintenance_requests')
    .insert({
      owner_id: ownerId,
      unit_id: lease.unit_id,
      tenant_id: resolved.tenant_id,
      title,
      description: analysis.description ?? transcript,
      urgency,
      status: 'open',
      notes: `Auto-created from SMS conversation ${event.chat_id}.`,
    })
    .select('id')
    .single()
  if (mrErr || !mr) {
    throw new Error(`maintenance insert failed: ${mrErr?.message}`)
  }

  // Download + upload photos. Best-effort: one failure doesn't
  // abort the whole message.
  const storedPaths: string[] = []
  for (const url of remoteUrls) {
    const media = await downloadRemoteMedia(url)
    if (!media) continue
    const path = `${ownerId}/maintenance/${mr.id}/${media.filename}`
    const { error: upErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, media.bytes, {
        contentType: media.contentType,
        upsert: false,
      })
    if (upErr) {
      console.warn('[retell-webhook] photo upload failed', upErr.message)
      continue
    }
    storedPaths.push(path)
  }
  if (storedPaths.length > 0) {
    await supabase
      .from('maintenance_requests')
      .update({ photos: storedPaths })
      .eq('id', mr.id)
  }

  // --- 6. Log a companion communication tied to the ticket ------
  await supabase.from('communications').insert({
    owner_id: ownerId,
    entity_type: 'maintenance_request',
    entity_id: mr.id,
    direction: 'inbound',
    channel: 'sms',
    content: transcript || '[empty transcript]',
    external_id: event.chat_id,
    metadata: {
      from_number: e164,
      analysis,
      photos_attached: storedPaths.length,
    },
    created_by: 'webhook',
  })

  // --- 7. Notify the landlord (stubbed Resend) -----------------
  const { data: landlordUser } = await supabase.auth.admin.getUserById(ownerId)
  const landlordEmail = landlordUser?.user?.email
  if (landlordEmail) {
    const { data: unitRow } = await supabase
      .from('units')
      .select('unit_number, property:properties(name)')
      .eq('id', lease.unit_id)
      .maybeSingle()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = unitRow as any
    const unitLabel = u?.property?.name
      ? `${u.property.name}${u.unit_number ? ` · ${u.unit_number}` : ''}`
      : 'Unit'
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('first_name, last_name')
      .eq('id', resolved.tenant_id)
      .maybeSingle()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = tenantRow as any
    const tenantName = t
      ? `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() || 'Tenant'
      : 'Tenant'

    await sendAutoMaintenanceNotification({
      to: landlordEmail,
      landlordName:
        (landlordUser?.user?.user_metadata?.full_name as string | undefined) ??
        'Landlord',
      tenantName,
      unitLabel,
      severity,
      description: analysis.description ?? transcript,
      maintenanceUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard/maintenance/${mr.id}`,
    })
  }
}

function transcriptToText(messages: RetellMessage[]): string {
  return messages
    .map((m) => {
      const who = m.role === 'user' ? 'Tenant' : 'Assistant'
      return `${who}: ${m.content}`
    })
    .join('\n\n')
}

# Sprint 13 — Outstanding Needs

Everything that's faked, stubbed, or waiting on human input before
the tenant SMS support line actually works in production. Grep the
codebase for `TODO(sprint-13)` to find every stub in-line; each
comment references a section here.

Last updated: 2026-04-17

---

## 1. Retell AI account + agent provisioning

### What's stubbed
- `app/lib/sms/retell-adapter.ts` → `createSupportAgent()` returns a
  fake `agent_id` like `stub_agent_xyz123`.
- `app/lib/sms/retell-adapter.ts` → `provisionPhoneNumber()` returns
  a fake E.164 number like `+15550001234`.

### What's needed before production
- A Retell AI account (retellai.com).
- `RETELL_API_KEY` in `.env.local`.
- Decide on the Retell chat-agent system prompt. Draft lives in
  `app/lib/sms/retell-adapter.ts` — review before enabling.
- Decide on `post_chat_analysis_data` schema. Current draft:
  `issue_type` enum (plumbing, electrical, hvac, appliance, pest,
  structural, safety, other), `severity` enum (emergency, high,
  medium, low), `unit_label` string (tenant-provided), `description`
  string, `photo_urls` array. Swap at the call site in
  `app/actions/phone-lines.ts::provisionSupportLine`.

### Per-landlord model
Each landlord gets their own `chatAgent` + number. No Retell
sub-accounts, so tenancy is enforced at our app layer via the
`landlord_phone_lines` table and the `[landlordId]` URL segment
on the webhook route.

---

## 2. Twilio credentials (BYO per landlord)

### What's stubbed
- Nothing yet. Twilio provisioning happens via Retell's API —
  when we swap `retell-adapter.provisionPhoneNumber` for the real
  call, we pass the landlord's Twilio SID + auth token to Retell
  so Retell-owned webhooks route through the landlord's Twilio
  account.

### What's needed
- A UI in `/dashboard/settings/sms` for the landlord to paste
  their Twilio Account SID + Auth Token. Store encrypted at rest
  (Postgres `pgcrypto` or Supabase Vault — pick one).
- Plain-text storage is NOT acceptable even in dev. If encryption
  isn't ready, block the provisioning flow and show a placeholder.

---

## 3. A2P 10DLC registration (THE BIG BLOCKER)

US carriers require brand + campaign registration before
commercial SMS flows reliably. Unregistered numbers work for a
day or two, then messages start getting silently filtered.

### What's stubbed
- `provisionSupportLine()` sets `status='pending'` and leaves the
  brand/campaign IDs null. There is NO code path today that
  actually submits brand info to the carrier.

### What's needed
- A multi-step form in SMS settings to collect: legal business
  name, EIN, address, website, sample messages, opt-in flow
  description. Submit via Twilio's BrandRegistration + Campaign
  API (or Retell's wrapper, TBD).
- Real-time status polling — the flip from `pending` → `active`
  happens on a carrier callback that takes hours to weeks.
- In-app messaging explaining the delay so landlords don't file
  support tickets thinking we're broken.
- Until this is built, activation is manual (Arthur toggles the
  row in Supabase).

### Timeline expectation to set with users
- Brand registration: hours to days.
- Campaign vetting: days to weeks.
- Do not promise "provision a number today and start texting."

---

## 4. Resend (or Postmark) for landlord notifications

### What's stubbed
- `app/lib/sms/resend-adapter.ts` → `sendAutoMaintenanceNotification()`
  logs the payload and returns a fake message id.

### What's needed
- `RESEND_API_KEY` in `.env.local`.
- A verified sending domain (DNS records).
- Email template: "New maintenance request from [tenant] (Unit X)
  — [description preview]. Severity: [level]. [link to request]".
- Optional: SMS notification to the landlord too (via their own
  Twilio number? Their personal cell? Their Retell support agent
  outbound? Decision pending.)

---

## 5. Retell webhook signature verification

### What's stubbed
- `app/lib/sms/verify-signature.ts` → `verifyRetellSignature()`
  uses a best-guess header name and digest format (HMAC SHA-256
  hex over raw body). MUST be verified against Retell's live
  payload before production.

### What's needed
- Capture one real webhook payload in dev (point Retell at an
  ngrok tunnel, send a test message).
- Confirm:
  - Exact header name (e.g. `X-Retell-Signature` vs
    `Retell-Signature`).
  - Digest format (hex, base64, or `sha256=...` prefixed).
  - Whether the signed payload is the raw body or includes a
    timestamp prefix (like Stripe does).
- Update `verifyRetellSignature()` accordingly and mark the TODO
  resolved.

---

## 6. Retell chat_analyzed payload shape

### What's stubbed
- `app/lib/sms/retell-payload.ts` defines a Zod schema that
  matches Retell's documented shape as of Sprint 13b planning.
  Real payload fields may differ.

### What's needed
- Confirm against a live payload in dev.
- Pay specific attention to: `call_id` vs `chat_id`, media/MMS
  URL format, how `post_chat_analysis_data` is nested
  (top-level vs inside an `analysis` object).
- Fix the schema if the live payload doesn't parse.

---

## 7. SSRF allowlist for inbound media download

### What's stubbed
- `app/lib/storage/sms-media.ts` → `downloadRemoteMedia()` has a
  hostname allowlist initialized with placeholder domains
  (`['api.twilio.com', 'media.twilio.com']`). Confirm the exact
  CDN domain Retell hands us for MMS attachments.

### What's needed
- One real MMS test in dev.
- Add the real media CDN hostname to the allowlist.
- DO NOT remove the allowlist — the webhook handler is
  unauthenticated, so fetching arbitrary URLs from its payload
  would be a textbook SSRF.

---

## 8. Phone-number normalization

### What's stubbed
- `app/lib/phone.ts` ships with `libphonenumber-js` (already a
  dependency after Sprint 13b). Defaults to US.

### What's needed
- Decide whether international tenants are in-scope. If yes,
  expose a "default country" on each landlord so normalization
  picks the right region.

---

## 9. `provisionSupportLine()` end-to-end flow

### What's stubbed
- The action writes a `landlord_phone_lines` row with
  `status='pending'` and fake Retell/Twilio IDs.

### What's needed
- Swap the three stubbed calls (create agent, provision number,
  generate webhook secret — the last one is real already) for
  real Retell SDK calls.
- Handle partial-failure rollback (if agent creation succeeds but
  number provisioning fails, delete the agent).
- Build the A2P 10DLC follow-up flow (section 3).

---

## Environment variables to add

Put these in `.env.local` (do not commit). The app should fail
loudly on startup if any are missing AFTER the relevant feature is
activated — not silently fall back to stubs.

```
RETELL_API_KEY=...           # from retellai.com dashboard
RESEND_API_KEY=...           # from resend.com
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Each landlord supplies their own Twilio creds via the settings UI
# (stored encrypted in the landlord_phone_lines table) — no global
# Twilio key needed here.
```

---

## Manual migrations to apply against Supabase

All three land with Sprint 13b. Apply in order:

1. `db/migrations/2026_04_17_phone_lines.sql`
2. `db/migrations/2026_04_17_tenant_sms_identities.sql`
3. `db/migrations/2026_04_17_retell_webhook_events.sql`

Sprint 13a migration (already shipped) also needs applying if it
hasn't been yet:

- `db/migrations/2026_04_17_communications.sql`

---

## Activation checklist (before going live with a first landlord)

- [ ] Retell account created; `RETELL_API_KEY` in env
- [ ] Resend account + verified domain; `RESEND_API_KEY` in env
- [ ] Twilio credentials flow tested end-to-end in dev
- [ ] Brand + campaign registration submitted and approved
- [ ] Real webhook payload captured; signature verification
      confirmed working
- [ ] Media allowlist updated with real CDN hostname
- [ ] Landlord notification email template reviewed
- [ ] Retell system prompt reviewed (sounds helpful, not robotic)
- [ ] End-to-end smoke test: send a real SMS → verify it creates
      a maintenance request → verify the landlord gets an email

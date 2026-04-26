# Proof Check — Outstanding Needs

Everything that's stubbed, partial, or waiting on human/partner
input before the screening module is fully production-grade. The
core feature ships and works today — these are deferred extensions
and partner integrations.

Last updated: 2026-04-26

---

## 1. PDF text extraction (income consistency check)

### What's stubbed
- `app/lib/screening/text-extractors/pay-stub.ts` →
  `extractPayStubText()` returns `null` for all PDFs. The income-
  consistency check then sees `payStubText: null` and skips itself —
  no signals, no errors. The engine still runs successfully.

### What's needed before activation
- Choice of extractor:
  - **`pdfjs-dist`** for digital (text-layer) PDFs. Lightweight,
    no external API. Doesn't help with scanned PDFs.
  - **OCR provider** (AWS Textract, Google Document AI, or
    Mathpix) for scanned PDFs. Paid per page.
  - Most pay stubs from ADP/Gusto/Paychex are digital — start with
    `pdfjs-dist`, layer OCR only when needed.
- Replace the stub body with the chosen extractor.
- Once text is extracted, the existing regex in
  `app/lib/screening/income-consistency.ts` immediately starts
  raising `income_math_inconsistent` and `pay_frequency_mismatch`
  signals when warranted.

---

## 2. Live Anthropic AI summary

### What's stubbed
- `app/lib/screening/ai-summary.ts` → falls back to a deterministic
  template when `ANTHROPIC_API_KEY` is missing. Template is good
  enough for staging; live AI gives nicer narrative.

### What's needed before activation
- `ANTHROPIC_API_KEY` in `.env.local` and Vercel env.
- (Optional) override default model with `SCREENING_AI_MODEL`.
  Default is `claude-opus-4-7`.
- Verify a sample report generates a live summary and the audit log
  records `model: 'claude-opus-4-7'` (not `'stub'`).

### Cost note
- ~1k input + 1k output tokens per report at current Opus pricing.
- 100 screenings/month ≈ trivial cost.

---

## 3. Eviction database lookup (partner-wired)

### What's stubbed
- No file yet — placeholder for the partner integration. The signal
  kinds `eviction_record_match` and `eviction_record_alias_match`
  are defined in the enum and surface correctly in the UI when
  raised, but no engine code currently raises them.

### What's needed before activation
- Pick a partner: **Checkr**, **RentPrep**, or **TransUnion
  SmartMove**. Tradeoffs:
  - Checkr: dev-friendly API, $25-30 per check, quick onboarding.
  - RentPrep: cheaper ($15-20), slower onboarding, more landlord-
    focused.
  - SmartMove: traditional player; tenant pays directly.
- API credentials in `.env.local` (var name TBD by partner choice).
- New file: `app/lib/screening/eviction-lookup.ts` — takes
  `(firstName, lastName, dob, addressHistory)`, returns
  `EvictionMatch | null`. The engine calls it after PDF forensics.
- `SCREENING_REQUIRE_EVICTION_CHECK` env var (default `false` in
  dev). When `true`, a missing/down eviction-check downgrades the
  report status to `partial` instead of `complete`.

---

## 4. Identity verification (partner-wired)

### What's stubbed
- Same as eviction — `identity_verification_failed` signal kind
  exists in the enum but no engine code raises it.

### What's needed before activation
- Pick a partner: **Persona** or **Jumio**. Both verify a
  government-issued ID + selfie liveness check.
- API credentials in `.env.local`.
- New file: `app/lib/screening/identity-verification.ts` — takes
  the `photo_id` document path, returns `IdentityCheckResult`.
- Add `identity_check_provider` and `identity_check_completed_at`
  population in the engine.

---

## 5. Reverse-phone employer verification

### What's stubbed
- No file yet. The signal kinds
  `employer_phone_burner_or_voip` and
  `employer_phone_reused_across_applicants` are defined.

### What's needed before activation
- Twilio Lookup API (already in the rentapp dep tree for the SMS
  line — same provider).
- Existing `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` env vars
  cover this.
- New file: `app/lib/screening/employer-verification.ts` — takes
  the prospect's stated employer phone, calls Twilio Lookup,
  returns `{ carrier, lineType }`. Raise burner/VOIP signal when
  `lineType` is `voip` or `non-fixed-voip`.
- Cross-applicant check: query other completed reports for the
  same landlord — if the same employer phone appears in another
  prospect's stated_employer_phone, raise the reuse signal.

---

## 6. WHOIS / domain age check

### What's stubbed
- No file. Signal kinds
  `employer_email_domain_invalid` and
  `employer_email_domain_freshly_registered` defined.

### What's needed before activation
- Either a WHOIS provider (e.g., **WhoisXML API** ~$10/mo) or
  Node's built-in `dns.resolveMx` for free MX-record check (less
  signal but free).
- Free tier first: just `dns.resolveMx` for MX validity. Domain
  age requires WHOIS.

---

## 7. Font and image-overlay PDF forensics

### What's stubbed
- `app/lib/screening/pdf-forensics.ts` only checks metadata
  (Producer, Creator, ModDate vs CreateDate). The signal kinds
  `pdf_font_inconsistency` and `pdf_image_overlay_detected` are
  defined but not raised.

### What's needed
- Cross-page font analysis using `pdfjs-dist` (parses individual
  text runs and their fonts). Significant work — defer until the
  metadata-only check has been validated against real-world fraud.
- Image-overlay detection: render each PDF page, scan for raster
  regions over text. Even more work; consider OCR-based duplicate
  text detection as a simpler proxy.

---

## 8. Reference phone unreachable check

### What's stubbed
- Signal kind `reference_phone_unreachable` defined; no engine
  code.

### What's needed
- Twilio Lookup again — `lineType: 'unknown'` or invalid number
  raises the signal.
- Optional: Twilio Voice ping (place a 1-ring call) for stronger
  signal at ~$0.01/check.

---

## 9. Address history consistency

### What's stubbed
- Signal kind defined; no engine.

### What's needed
- Public-records source. Options:
  - **Whitepages Pro / Spokeo API** (~$0.10 per lookup).
  - **National Change of Address (NCOA)** via a USPS partner.
- Cross-check applicant's stated previous-address against records.
  Mismatches raise `address_history_inconsistent`.

---

## 10. Live application_documents storage policies

### What's deferred
- The `application-documents` Supabase Storage bucket is created
  but its **bucket-level RLS policies are not codified** in a
  migration — they live in the Supabase dashboard's Storage policy
  editor. The bucket is private (not public-readable), so RLS
  enforces ownership.

### What's needed
- Document the storage policy in `db/migrations/` (or a separate
  storage-policies.sql) so it can be reapplied on a fresh project.
- Match the existing `rentapp-photos` bucket policy convention:
  authenticated reads scoped to paths beginning with the user's
  own `auth.uid()`.

---

## 11. Stated facts on prospect record

### What's stubbed
- Screening reports currently don't snapshot `stated_income_monthly`
  / `stated_employer` / `stated_employer_phone` /
  `stated_employer_email` because those fields are stored as free
  text in `prospects.inquiry_message`.

### What's needed
- Migration adding structured columns to `prospects`:
  `stated_monthly_income numeric(10,2)`, `employer text`,
  `employer_phone text`, `employer_email text`.
- Update `submitApplication` (public application action) to
  populate them in addition to the inquiry_message blob.
- Update `createScreeningReport` to read them and persist onto the
  report (the columns on `screening_reports` already exist).

---

## Tracking

Grep the codebase for `TODO(screening)` to find every in-line stub
that references this document. As of 2026-04-26 there is one such
TODO marker (text-extractor stub).

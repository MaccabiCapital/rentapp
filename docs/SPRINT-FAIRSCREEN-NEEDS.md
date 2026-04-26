# FairScreen — Outstanding Needs

What's stubbed or deferred from the FAIRSCREEN-SPEC.md sprint plan.
The spec calls for 13 phases; this session shipped a minimum-viable
slice (listing scanner end-to-end, federal + CA + NY rule packs).
Everything below is queued for follow-up sessions.

Last updated: 2026-04-26

---

## What shipped today

- Phase 2: 5 tables + 5 enums + 5-state seed + storage bucket ✅
- Phase 3: schemas + queries (full) ✅
- Phase 4: rule packs — federal + CA + NY (TX, FL, WA = federal-only
  fallback for v1) ✅
- Phase 5 (partial): listing-scanner.ts + signal-builders.ts ✅
- Phase 6 (partial): scanListingCopy + acknowledge/dismiss/markFixed
  finding actions ✅
- Phase 7 (partial): Compliance overview shows scanner + open
  findings + severity tiles ✅

---

## 1. Tenant Selection Criteria authoring (Phase 7 wizard)

### What's deferred
- `/dashboard/compliance/criteria` library page
- `/dashboard/compliance/criteria/new` 6-step wizard
- `createCriteria` / `updateCriteria` / `publishCriteria` server actions
- `criteria_versions` snapshot writes on save
- `criteria-generator.ts` engine (compliance-checks the saved criteria
  against the rule pack)

### What's already in place
- `tenant_selection_criteria` + `criteria_versions` tables exist
- Schema types in `app/lib/schemas/compliance.ts`
- Read queries can be extended in `app/lib/queries/compliance.ts`
- Storage bucket `compliance-documents` is live for the eventual PDF

---

## 2. Criteria PDF rendering

### What's deferred
- `app/lib/compliance/pdf/criteria-renderer.ts` (uses pdf-lib —
  already a dep)
- `regenerateCriteriaPdf` server action
- Storage helper `app/lib/storage/compliance-documents.ts`

### Notes
- v1 design: clean text layout with jurisdiction footer + fair-housing
  disclosure. Polish comes in v2.
- The path scheme is `{ownerId}/criteria/{criteriaId}/v{version}.pdf`
  per FAIRSCREEN-SPEC §2.7.

---

## 3. Question audit (application question validator)

### What's deferred
- `app/lib/compliance/question-validator.ts`
- `validateScreeningQuestion` server action
- Hook into the existing application-question editor (which doesn't
  yet exist in rentapp — questions today are hardcoded fields on the
  `/apply/[slug]` form)

### Activation order
1. First build the application-question editor module (currently the
   `/apply/[slug]` form has fixed fields — landlords can't customize)
2. Then layer the validator on top

---

## 4. Outbound + inbound message scanner persistence

### What's deferred
- `app/lib/compliance/message-scanner.ts` — wraps the existing
  `scanInboundMessage` / `scanOutboundMessage` from
  `fair-housing-guardrails.ts` and writes findings to
  `compliance_findings` (today they only write to
  `leasing_messages.guardrail_flags`)

### Why defer
- The leasing-assistant flow ALREADY captures these flags; the spec
  just unifies them into the cross-domain inbox. Functional today;
  cosmetic in inbox.

---

## 5. Disparate-impact engine + nightly cron

### What's deferred
- `app/lib/compliance/disparate-impact.ts` — cohort analysis
  (income band, credit band, eviction-history yes/no, application
  order percentile)
- `app/api/cron/disparate-impact/route.ts` — daily 03:00 UTC
- `vercel.json` cron entry
- `runDisparateImpactNow` server action
- `/dashboard/compliance/disparate-impact` page

### Critical gotcha (FAIRSCREEN-SPEC §1)
**The disparate-impact engine MUST NOT read name, email, phone, or
address.** Bias-neutrality is a Phase-11 acceptance test in the spec.
Cohort dimensions are non-PII signals only.

### Threshold
- Founder-Q-answered: 10 decisions in 90 days minimum to run.

---

## 6. Compliance audit log page + CSV export

### What's deferred
- `/dashboard/compliance/audit` (full filterable view)
- CSV export route mirroring the screening audit pattern
- Sidebar wiring from the Compliance overview

### What's in place
- `compliance_audit_log` table with append-only writes from every
  scan / acknowledgement / dismissal action
- Read query `getComplianceAuditLog` ready

---

## 7. Findings inbox standalone page

### What's deferred
- `/dashboard/compliance/findings` standalone page
- Filter UI: source, severity, status, jurisdiction, date range
- Bulk actions ("acknowledge selected")
- CSV export

### What's in place
- Findings listed inline on the Compliance overview today
- ComplianceFindingRow component is reusable for the standalone page

---

## 8. Other state rule packs (TX, FL, WA)

### What's stubbed
- `app/lib/compliance/rules/index.ts` returns an empty `[]` for TX,
  FL, WA — meaning the federal baseline applies but no state-specific
  rules.

### What's needed
- New files: `tx.ts`, `fl.ts`, `wa.ts` mirroring the structure of
  `ca.ts` and `ny.ts`. Each adds state-specific patterns:
  - **TX:** Austin / Dallas city-level SOI add-ons (Austin requires
    voucher acceptance citywide).
  - **FL:** Miami-Dade and Broward County SOI add-ons. State-level
    LGBTQ+ case law (Bostock interpretation).
  - **WA:** SOI protection (RCW 59.18.255), Seattle Fair Chance
    Housing Ordinance.

### Attorney review
- All state rule packs need attorney review before public marketing.
  Engage attorneys for the 5 states post-Phase-7 per the founder-Q
  answer (~$2-5k cost, blocks marketing only).

---

## 9. Listing scanner — apply-suggestion writeback

### What's deferred
- "Apply suggestion" button on findings (currently shows the
  suggested rewrite but doesn't write it back to the listing row)

### What's in place
- The finding row UI shows the suggested rewrite as text
- `subject_listing_id` is captured on each finding

### Effort
- One server action that updates `listings.description` (or the
  appropriate field) with confirmation modal. Half a session.

---

## 10. Sidebar reorganization

### What's deferred (per FAIRSCREEN-SPEC §3.12)
- Promote Compliance to a top-level sidebar entry with sub-items:
  - Overview (current page)
  - Tenant Selection Criteria
  - Listings (scanner)
  - Findings inbox
  - Disparate impact
  - Audit log

### What's in place
- Compliance lives under "Operations" in the sidebar
- Audit log linkage from Compliance overview already wired

---

## Tracking

Grep the codebase for `TODO(compliance)` to find every in-line stub.
As of 2026-04-26 there are zero such markers — all deferred work
lives in this document, not in scattered TODOs.

---

## Phase order for next session

Recommended:
1. **#9 apply-suggestion writeback** — fastest, highest immediate UX win
2. **#1 criteria wizard** — biggest landlord-visible feature, unlocks
   #2 (PDF) which is the lawsuit-shield artifact
3. **#5 disparate-impact engine + cron** — completes the FairScreen
   "process audit" half of the lawsuit-shield positioning
4. **#8 remaining state rule packs** — straightforward expansion
5. **#3 question audit** — depends on the application-question
   editor existing first

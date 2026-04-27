# Rentbase — marketing pitch

_Working draft. Edit / cut / re-tone as needed._

---

## One-liner

**Rentbase is the operating system for landlords who own 3–20 rental units —
the ones too big for spreadsheets, too small to justify Buildium.**

## Target customer

- **Independent residential landlords** with 3–20 doors
- Self-managing, no leasing agent on staff
- Currently using: Excel + email + a free RentRedi/Avail tier they hate
- Owner-operator, not corporate property management
- US-based (state-specific compliance is built in)

**Not a fit:** corporate PM with 50+ doors (use AppFolio / Buildium / Yardi),
single-property side-hustle (use a spreadsheet and a CPA).

---

## The problem we solve

Mid-size landlords are stuck between two bad options:

1. **Spreadsheets + email**: cheap, but you forget renewals, miss late
   fees, write fair-housing-noncompliant listings without realizing it,
   chase tenants for paper signatures, and lose paystubs in your inbox.
2. **Buildium / AppFolio**: $300–800/mo for software designed for
   property managers, with seventeen settings panels, two onboarding calls,
   and dashboards built for portfolios you don't have.

Rentbase is the missing middle: spreadsheet-simple, but it remembers everything,
runs the compliance checks for you, and has AI doing the boring writing.

---

## What makes us different (the four pillars)

### 1. Fair housing is a system property, not a feature

Most competitors leave compliance to the landlord and hope you read the
HUD guidance. We refuse to ship AI that touches a housing decision, and
we strip protected-class language at three layers (system prompt + regex
strip-list + deterministic post-scan).

- AI describes / summarizes / drafts. AI never decides.
- Listing copy generator catches "ideal for", "professionals only",
  "no Section 8" before you publish.
- Leasing assistant drafts replies that pass an outbound scanner with
  state-specific rule packs (CA, NY, FL, TX, WA, MI + federal baseline).
- Proof Check (forensic screening) shows you signals; you make the call.
  No AI ever recommends approve/deny.

### 2. Tenants don't need an account

The features that need tenant participation use **token URLs** — one-time
links that work like magic-link signing. Lower friction, higher follow-through.

- Sign a lease without creating an account
- Pay rent (Stripe-bound)
- Submit maintenance ticket
- See lease info, get receipts, view rent history
- Renters insurance proof upload

The landlord has the dashboard. Tenants have a link. Neither has to
manage a password they'll forget.

### 3. Forensic-grade screening, fair-housing safe

Proof Check is a deterministic engine that examines paystubs, bank
statements, references, and identity documents. It surfaces signals
("income math inconsistent — stated $5,000/mo, paystub implies $3,200/mo")
without ever being the decision-maker.

- Reads paystubs via OCR (Anthropic vision); cross-checks gross pay
  against stated income with state-correct frequency multipliers.
- Verifies employer phone numbers (Twilio Lookup integration).
- Cross-references prior addresses against eviction records (planned).
- Generates a plain-English AI summary that ends with a numbered
  "verify these before signing" checklist — and a closing line:
  *"This is a recommendation. The decision is yours."*

### 4. End-to-end e-sign with audit trail

Lease execution without DocuSign:

- Send tenant a token link → they type their name + draw a signature
  on a canvas → IP, user agent, timestamp captured.
- Counter-sign as landlord from the dashboard.
- Both signatures stamp into the downloadable lease PDF (with the
  "REFERENCE ONLY — NOT A LEGAL LEASE" disclaimer).
- Token is single-use, 14-day TTL, auto-voided after success.
- Signed PDF doubles as the audit artifact for state record-keeping.

---

## Feature list, by what landlords actually do

### Manage your inventory
- Properties (multi-unit and single-family)
- Units with bedroom/bathroom/sq-ft tracking
- Photo galleries per property/unit
- Insurance policies (per property)
- Inspections schedule + walk-through reports + photo timestamping
- Maintenance tickets + recurring task scheduler
- Bulk import via CSV (properties, units, leases, tenants)

### Find tenants
- Public listing pages (custom URL per listing, served fast)
- AI description generator (fair-housing-safe, ~120 words from your
  property facts + a "highlights" seed)
- Inquiry form with Cloudflare Turnstile + honeypot (no spam)
- Prospect pipeline (inquired → toured → applied → screened → decided)
- Application form (configurable per landlord)
- Application FAQ bot for prospects (planned: live AI mode)

### Screen with confidence
- Proof Check forensic screening engine
- Document-by-document signal generation
- AI summary with three-layer fair-housing guardrails
- Audit log for every screening decision (3+ year retention, FCRA-grade)
- FairScreen criteria editor (state-specific safe-harbor rule packs)
- Listing copy fair-housing scanner with red/amber/green findings

### Sign leases
- Lease summary PDF (state your terms, generate a printable doc)
- Token-based tenant e-signing (canvas pad, mobile + stylus support)
- Landlord counter-sign modal
- Forensic capture: typed name + signature image + IP + UA + timestamp
- Both signatures stamp into the PDF when fully executed
- Lease.signed_at auto-stamped when both parties sign

### Collect rent
- Rent schedule auto-generated from lease terms (monthly recurring)
- Stripe integration (when activated)
- Manual mark-as-paid for cash/check
- Receipt PDFs
- Late fee auto-application (daily 9am UTC cron, state-cap-respected)
- "Run scan now" button for impatient landlords

### Run the lifecycle
- Renewals — 90-day expiry alert per active lease
- Notices — termination, late fee, tenant notice (with PDF generator)
- Security deposit accounting + interest accrual (state-correct)
- Renters insurance proof tracking + expiry reminders
- Tenant turnover workflow (move-out inspection → make-ready →
  re-listing trigger)
- Late fees waived/paid status with audit reason

### Communicate
- Inbox (triage queue for inbound communications)
- SMS via Twilio (when activated)
- Email via Resend (when activated)
- Voice AI line via Retell (when activated)
- Per-tenant message thread
- AI Leasing Assistant drafts replies to prospects (Claude Sonnet,
  fair-housing-aware system prompt)

### Stay compliant
- State-by-state rule packs (CA, NY, FL, TX, WA, MI + federal)
- Listing copy compliance scanner
- Late fee state caps applied automatically (e.g., NY ≤ 5%)
- Security deposit interest rates per state
- Required disclosures by jurisdiction (planned)
- Audit log retention for FCRA / fair housing compliance

### See what's happening
- Overview dashboard with KPI cards (occupied units, rent collected,
  renewals due, etc.)
- Reports across properties / units / tenants
- Financials (P&L per property, expense tracking)
- Inspection comparison (before/after)
- Workflow center: First setup, Late rent, Onboard tenant, Offboard
  tenant, Turnover unit, Annual renewal

---

## Pain points → solutions

| What landlords say | What Rentbase does |
|---|---|
| "I keep losing track of when leases end" | 90-day renewal alert + Workflows → Annual renewal |
| "I forgot to charge the late fee again" | Daily auto-scan applies fees state-correctly |
| "I'm scared of saying the wrong thing in a listing" | AI generator catches protected-class language at 3 layers |
| "Background checks are expensive AND stressful" | Proof Check on documents you already collect; AI summarizes signals |
| "Tenants ghost me on lease signing" | Token e-sign — they sign on their phone in 2 minutes |
| "I'm chasing rent every month" | Stripe rent collection + auto-reminders + late fee enforcement |
| "I don't know if I should approve this applicant" | Proof Check shows signals; AI never decides; you decide |
| "Buildium feels like flying a 747 to drive to the grocery store" | 8 sidebar items by default, advanced features behind one click |
| "I'm worried about fair housing complaints" | Audit log per decision, scanner per listing, guardrails per AI output |

---

## Pricing positioning (TBD)

Suggested anchors:

- **$29/mo for 3–10 units** — undercuts RentRedi, beats Excel
- **$59/mo for 11–20 units** — half of Buildium starter
- AI features included (we eat the LLM cost; ~$3–5/mo per active landlord)
- Stripe rent collection: 2.9% + $0.30 (pass-through, no markup)
- Free tier: 1 unit, 1 listing, no AI features (acquisition channel)

Compare-against ad copy:

- vs RentRedi: *"All of RentRedi's tenant features, plus fair-housing
  AI baked in."*
- vs Avail: *"Avail's listings, plus a screening engine that doesn't
  recommend a decision (because that's illegal)."*
- vs Buildium: *"Like Buildium, but built for landlords, not property
  managers — and one-tenth the price."*

---

## Headline options (test these)

1. **The landlord OS that takes fair housing seriously.**
2. **Spreadsheet-simple. Buildium-powerful. Without the Buildium price tag.**
3. **Rent collection, lease signing, fair-housing AI — for landlords with
   3 to 20 units.**
4. **You shouldn't need a property manager to manage three rentals.**
5. **The first rental software that refuses to make the screening
   decision for you.** (lean into the safety angle)

---

## Channels worth testing

1. **r/Landlord, r/RealEstate** — content marketing on fair-housing
   gotchas, with Rentbase as the "and we built a tool that catches these"
   close.
2. **BiggerPockets forums** — long-form posts on screening best
   practices, demo of Proof Check.
3. **Facebook landlord groups** (national + state) — direct community
   participation, free-tier offer.
4. **Local REIAs** — sponsor meetups, free 30-day trial code.
5. **Google Ads** — bid on "rental property management software small
   landlord" cluster, send to comparison landing page.
6. **County property records** — direct outreach to recently-recorded
   deeds for rental properties (warm: "you just bought a rental, here's
   how to manage it").
7. **Cold email to small portfolios** — state LLC + property records →
   verified landlord email → personalized intro.

---

## Risk / what to be careful about

- **Don't sell screening as a "decision tool".** Fair-housing lawsuits
  are real. Stay in the "we surface signals; you decide" lane.
- **Don't auto-charge tenants without consent flows.** Stripe ACH needs
  explicit micro-deposit auth; don't shortcut.
- **Don't promise "we replace your attorney".** Lease summary PDFs
  carry the "REFERENCE ONLY — NOT A LEGAL LEASE" banner for a reason.
- **State law changes.** Rule packs need quarterly attorney review per
  state we operate in. Bake this into the cost model.

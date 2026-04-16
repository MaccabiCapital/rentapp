# Rentapp

> The landlord operating system for independent residential landlords managing 3–20 units.

Rentapp is the development codebase for **Rentbase** (working product name; branding may change when the domain is registered). It's the active build target of the `cep-ventures` AI-agent experiment, committed to after Round 4 of methodology validation on Paperclip.

## What this is

A subscription SaaS that handles the full landlord workflow — not just operations:

- **Core ops:** Properties & units, tenant management, rent collection (ACH + card via Stripe Connect), maintenance request tracking, income/expense ledger
- **Growth layer (the wedge):** Vacancy marketing, prospect CRM, tenant screening, renewal automation. This is what DoorLoop, TurboTenant, and Buildium don't have at the $79–149/mo tier.

For the full business brief, unit economics, competitive research, and red team, see the [CEP round 4 artifacts](https://github.com/MaccabiCapital/rentapp/wiki) (or the `projects/ideas/rentbase/` folder on the CEP VPS).

**Pricing (planned):** $79/mo Core (up to 10 units) / $129/mo Pro (up to 20 units) / $199/mo Premium (up to 50 units).

**Target customer:** Independent landlords with 3–20 units, US-based, account size $25K–500K, currently juggling TurboTenant + DocuSign + Zillow + Stripe/Venmo/Zelle.

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| Auth | Supabase Auth via `@supabase/ssr` |
| Database | Supabase Postgres with Row Level Security |
| Forms | React Server Actions + Zod validation + `useActionState` |
| Payments | Stripe Connect (scaffolded, not wired until LLC + business account are set up) |
| Email | Resend (scaffolded) |
| SMS | Twilio (scaffolded; voice AI layer deferred to v2) |
| Deployment | Vercel (frontend) + Supabase Edge Functions (API) |

> **Note:** This is Next.js **16**, not 14. There are breaking changes from the training-data version. Before writing any Next.js code, read `node_modules/next/dist/docs/` — that's the source of truth. See `AGENTS.md` for the Next-version-aware AI agent instructions.

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/MaccabiCapital/rentapp.git
cd rentapp
npm install
```

### 2. Create a Supabase project

- Go to [supabase.com/dashboard/projects](https://supabase.com/dashboard/projects)
- Click **New project**
- Once provisioned, go to **Settings → API**
- Copy the **Project URL** and **anon/public key**

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the values from step 2. Leave the Stripe / Resend / Twilio keys blank for now — they're stubbed until you need them.

### 4. Apply the database schema

Open the **Supabase SQL Editor** and paste the contents of `db/schema.sql`. Run it. This creates the 7 tables (properties, units, tenants, leases, payments, maintenance_requests, prospects), RLS policies, indexes, and the `updated_at` trigger.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the landing page. Click **Start free** to create your first account.

## Project structure

Current shape as of Sprint 13:

```
rentapp/
├── app/
│   ├── (auth)/                 # Sign-in / sign-up / verify
│   ├── actions/*.ts            # Server actions — one file per domain (tenants, leases,
│   │                           #   maintenance, rent, insurance, communications, etc.)
│   ├── api/
│   │   └── webhooks/
│   │       └── retell/[landlordId]/route.ts   # Inbound SMS webhook (Sprint 13b)
│   ├── dashboard/              # Every protected page lives under here
│   │   ├── layout.tsx          # Sidebar + mobile nav drawer + auth enforcement
│   │   ├── page.tsx            # Overview (stat cards + upcoming events feed)
│   │   ├── properties/         # Property list, detail, new, edit + unit nesting
│   │   ├── tenants/            # Tenant CRUD + lease nesting + comms + SMS identities
│   │   ├── rent/               # Rent schedules + simulate button + mark-paid
│   │   ├── maintenance/        # Maintenance requests (urgency, status, photos, comms)
│   │   ├── prospects/          # Pipeline CRM with stage buttons
│   │   ├── listings/           # Public-facing landing pages for vacancies
│   │   ├── renewals/           # Leases expiring soon + tenant-notice tracking
│   │   ├── financials/         # YTD P&L, expenses, income, Schedule E CSV, tax PDF
│   │   ├── insurance/          # Policies + property junction
│   │   ├── team/               # Vendor directory
│   │   ├── compliance/         # State rent rules reference
│   │   ├── inbox/              # Triage queue for unresolved inbound SMS
│   │   └── settings/sms/       # Support-line provisioning
│   ├── lib/
│   │   ├── format.ts           # Shared formatCurrency / formatDate
│   │   ├── now.ts              # Purity-lint-friendly Date.now() wrapper
│   │   ├── phone.ts            # libphonenumber-js E.164 normalization
│   │   ├── rent-schedule-status.ts   # Pure status computation (unit-tested)
│   │   ├── queries/*.ts        # RLS-scoped Server Component data loaders
│   │   ├── schemas/*.ts        # Zod schemas + TS types for every domain
│   │   ├── sms/                # Retell/Twilio/Resend adapters (stubbed), HMAC verify
│   │   └── storage/            # Supabase Storage path builders + media downloader
│   └── ui/                     # Shared React components
├── lib/supabase/
│   ├── server.ts               # SSR client
│   ├── client.ts               # Browser client
│   ├── proxy-client.ts         # Used by proxy.ts for optimistic session refresh
│   ├── service-role.ts         # RLS-bypass client (webhook only — never imported client-side)
│   └── get-user.ts             # Safe auth probe for layouts
├── db/
│   ├── schema.sql              # Canonical Postgres schema. Keep in sync with migrations.
│   └── migrations/             # One file per migration, dated. Applied manually via Supabase SQL editor.
├── test/                       # Vitest pure-function tests
├── docs/
│   └── SPRINT-13-NEEDS.md      # External-dep checklist for Sprint 13 activation
├── proxy.ts                    # Next 16 proxy (middleware) — optimistic session refresh only
└── .env.local.example
```

## Developer crash course

### Conventions in 90 seconds

- **Auth**: the `proxy.ts` does an *optimistic* session refresh only. Real auth enforcement happens inside `app/dashboard/layout.tsx` via `getUser()` + `redirect('/sign-in')`. Never rely on the proxy for auth.
- **Queries**: every read lives in `app/lib/queries/<domain>.ts`, takes no auth arg, and relies on RLS to scope to the current user. Server Components call them directly.
- **Mutations**: every write is a Server Action in `app/actions/<domain>.ts`, returns the `ActionState` union (`{success:true} | {success:false,errors:{...}} | {success:false,message:string}`), and (for destructive actions) explicitly re-checks `auth.getUser()` plus adds `.eq('owner_id', user.id)` as defense in depth.
- **Schemas**: `app/lib/schemas/<domain>.ts` owns both the Zod validators and the hand-written TS row types. There are no generated Supabase types — we use `as any` on rows locally to avoid `never`-inference.
- **UI**: `app/ui/*.tsx` for shared components. Server components by default; `'use client'` only when you need hooks, local state, or handlers.
- **Forms**: every form uses React 19's `useActionState` with the signature above. The inline form pattern (see `log-communication-form.tsx`) clears itself on success.
- **Logs**: the `communications` table is polymorphic by `(entity_type, entity_id)`. Any CRM-like entity can have a timeline via `<CommunicationsTimeline entityType="tenant" entityId={...} />`.

### Adding a DB table — the whole ritual

1. Write `db/migrations/YYYY_MM_DD_<name>.sql` with: enums, CREATE TABLE, indexes, `alter table … enable row level security`, CREATE POLICY × N (select/insert/update/delete), trigger for `updated_at`.
2. Mirror every line into `db/schema.sql` (this is the canonical reference — the migrations directory is the change log).
3. Apply the migration manually through the Supabase SQL Editor. There's no automated migrator yet.
4. Add `app/lib/schemas/<domain>.ts`, `app/lib/queries/<domain>.ts`, `app/actions/<domain>.ts` following the pattern used by, e.g., `insurance`.
5. If the domain has a user-visible page, add `app/dashboard/<domain>/` (list + new + `[id]` + `[id]/edit` + `loading.tsx` + `error.tsx`).
6. Add the nav entry to `NAV_ITEMS` in `app/dashboard/layout.tsx` if it gets a sidebar link.

### What "ships green" means

- `npx tsc --noEmit` passes
- `npm run lint` passes
- `npm test` — 27 unit tests in `test/`, all pass
- `npm run build` — full Next build succeeds

Run all four before committing anything non-trivial.

### Demo seed

The dashboard has a **Demo data** card. Click **Load demo data** to populate a realistic 2-property portfolio (duplex + single-family) with units, tenants, leases, payments, maintenance, prospects, expenses, team members, insurance policies, listings, and communications. Click **Remove demo data** to clean it all out. Real data is never touched — demo rows are tagged with `[DEMO]` in their `notes` column.

### External integrations currently stubbed

As of Sprint 13, these are scaffolded but use fake data. See `docs/SPRINT-13-NEEDS.md` for activation steps.

| Area | Status | What's missing |
|---|---|---|
| Stripe Connect | Scaffolded, not wired | LLC + business bank account + Stripe onboarding |
| Resend email | Stubbed | Verified sending domain + `RESEND_API_KEY` |
| Retell AI (SMS) | Stubbed | `RETELL_API_KEY` + webhook payload verification |
| Twilio (MMS media) | Stubbed | Per-landlord Twilio credentials |
| A2P 10DLC | Not needed for testing | Only matters when scaling past sandbox volumes |

## Sprint plan

Sprint 0 (this PR) is scaffolding only. Real features come in subsequent sprints once customer discovery validates the wedge.

| Sprint | Focus | Status |
|---|---|---|
| **0** | Project scaffold, DB schema, auth flow, dashboard skeleton | **Complete** (this PR) |
| 1 | Properties & units CRUD | Pending |
| 2 | Tenant management + lease records | Pending |
| 3 | Rent collection (Stripe Connect ACH) | Pending |
| 4 | Maintenance request tracking | Pending |
| 5 | Prospect CRM (the wedge) | Pending — core differentiator |
| 6 | Renewal automation | Pending |
| 7 | Financials + Schedule E export | Pending |
| 8+ | v2 features from founder brainstorm: rent comp database, AI application scoring, landing page generator, voice AI business number | Pending (legal review required for AI features) |

## The CEP + Claude Code coordination protocol

Rentapp has **two AI instances** involved in its development:

- **CEP** — strategic PM on Paperclip. Writes sprint specs, red teams, customer feedback synthesis, roadmap decisions. Lives on the Hostinger VPS (`rescuemyworkday-cep` OpenClaw agent). Does NOT write code.
- **Claude Code** — implementation agent. Writes code, runs tests, manages the repo. Lives on the founder's laptop with filesystem + `git` + `gh` access.

### Handoff

For each sprint:

1. **CEP** writes the sprint spec as a Paperclip issue comment (ticket list, data model changes, acceptance criteria)
2. **Founder** reviews the spec, edits if needed, then pastes it into a Claude Code session
3. **Claude Code** implements against the spec, opens a PR
4. **Founder** reviews + merges the PR, deploys to Vercel
5. **Founder** reports sprint results back to CEP (what shipped, what customers said, what broke)
6. **CEP** updates the roadmap + plans the next sprint

CEP and Claude Code never talk to each other directly. The founder is the conductor.

## Fair housing compliance (hard requirement for v2 AI features)

Any AI-powered decision layer in Rentapp (application scoring, voice prescreening, anything that influences tenant approval) **must** use the fair-housing safe-harbor pattern:

1. **Deterministic rules engine** makes the actual qualification decision on legally-allowed signals (income-to-rent ratio, credit score, verified evictions, employment stability, direct references).
2. **AI layer** provides summary, explanation, and anomaly detection — never the decision itself.
3. **Human (the landlord) makes the final call.** AI output is labeled as recommendation, not decision.
4. **Never auto-reject.** Unqualified prospects can still formally apply; AI is a filter, not a gate.
5. **Always disclosed.** Every AI-generated output carries a fair-housing disclaimer.
6. **Always logged** for audit (3+ years retention per FCRA standard).

Forbidden signals: name-based ethnicity inference, address-based neighborhood scoring, source-of-income filtering, anything correlated with a protected class.

This is a hard line. A fair housing attorney review is required before launching any of these AI features.

## License

Proprietary — Maccabi Capital LLC (entity formation pending).

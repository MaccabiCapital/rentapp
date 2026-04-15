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

```
rentapp/
├── app/
│   ├── layout.tsx              # Root layout with fonts + branding
│   ├── page.tsx                # Landing page (redirects to /dashboard if signed in)
│   ├── (auth)/                 # Route group for unauthenticated pages
│   │   ├── layout.tsx          # Auth-pages layout (centered card)
│   │   ├── sign-in/page.tsx
│   │   ├── sign-up/page.tsx
│   │   └── sign-up/verify/page.tsx
│   ├── dashboard/              # Protected routes
│   │   ├── layout.tsx          # Sidebar nav + real auth enforcement
│   │   ├── page.tsx            # Dashboard home
│   │   ├── properties/page.tsx
│   │   ├── tenants/page.tsx
│   │   ├── rent/page.tsx
│   │   ├── maintenance/page.tsx
│   │   ├── prospects/page.tsx
│   │   ├── renewals/page.tsx
│   │   └── financials/page.tsx
│   ├── auth/callback/route.ts  # Supabase email confirmation handler
│   ├── actions/auth.ts         # Server actions: signUp / signIn / signOut
│   ├── lib/definitions.ts      # Zod schemas + shared TS types
│   └── ui/                     # Shared components (forms, empty states)
├── lib/
│   └── supabase/
│       ├── server.ts           # SSR client for server components
│       ├── client.ts           # Browser client for client components
│       ├── proxy-client.ts     # Session refresh for proxy.ts
│       └── get-user.ts         # Safe auth check (returns null on any error)
├── db/
│   └── schema.sql              # Initial Postgres schema + RLS policies
├── proxy.ts                    # Next 16 proxy (was middleware) — optimistic auth + session refresh
├── AGENTS.md                   # Next 16 agent instructions (read docs before coding)
├── CLAUDE.md                   # Claude Code project instructions
└── .env.local.example          # Environment variable template
```

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

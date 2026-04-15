@AGENTS.md

# Rentapp — Claude Code instructions

## What this project is

Rentapp is the development codebase for **Rentbase** (working product name). It's the landlord operating system for independent residential landlords managing 3–20 units. The full product brief, unit economics, competitive research, and red team were produced by the CEP agent on Paperclip during Round 4 of the cep-ventures experiment. Claude Code (you) implements against specs that come from CEP via the founder.

See `README.md` for the complete product overview, sprint plan, and tech stack.

## Division of labor

This repo has **two AI instances** involved:

- **CEP** — strategic PM on Paperclip (`rescuemyworkday-cep` OpenClaw agent on the Hostinger VPS). CEP writes sprint specs, red teams, roadmap decisions, and customer feedback synthesis. **CEP does NOT write code.** CEP's workspace is on the VPS, not the laptop.
- **Claude Code (you)** — implementation agent running on the founder's Windows laptop with direct filesystem, `git`, `gh`, and `npm` access. You write the actual code against specs from CEP.
- **Founder** — conductor, reviewer, deployer. Reviews CEP's specs, hands them to you, reviews your PRs, merges them, deploys to Vercel.

CEP and Claude Code never talk to each other directly. When you see a task in this repo, it came through the founder from CEP (or directly from the founder if it's a small fix or urgent bug).

## Next.js version — READ THE BUNDLED DOCS

**This is Next.js 16, not 14.** There are meaningful breaking changes:

- `middleware.ts` is renamed to `proxy.ts` (same semantics, new file name + export name)
- Async APIs for `cookies()`, `headers()`, `params`, `searchParams`
- Auth pattern uses React 19 `useActionState` + server actions + Zod

Before writing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/` — that's the source of truth. Your training data is likely outdated. Key docs:

- `node_modules/next/dist/docs/01-app/02-guides/authentication.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`

## Tech stack conventions

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 App Router + TypeScript + Tailwind | Standard modern stack |
| Auth | Supabase Auth via `@supabase/ssr` | Integrated with the database, RLS-ready |
| DB | Supabase Postgres with Row Level Security | Multi-tenant isolation at the DB level, not the app level |
| Forms | Server Actions + Zod + `useActionState` | Next 16 canonical pattern |
| Styling | Tailwind utility classes | Keeps component files self-contained |
| Package manager | npm (not pnpm, not yarn) | Matches `package.json` |

### Directory conventions

- `app/` — routes, layouts, pages (standard Next App Router)
- `app/actions/` — server actions (files marked `'use server'`)
- `app/lib/` — Zod schemas, TS types, utility functions scoped to the app
- `app/ui/` — React components (forms, buttons, cards, empty states)
- `app/(auth)/` — route group for unauthenticated pages (sign-in, sign-up, verify)
- `app/dashboard/` — protected route group (layout enforces auth)
- `app/auth/callback/route.ts` — Supabase email confirmation handler
- `lib/supabase/` — Supabase client factories (server, browser, proxy-specific)
- `db/` — SQL migrations and schema files

## Hard rules

### 1. Row Level Security is load-bearing

Every user-facing table in `db/schema.sql` has `owner_id UUID REFERENCES auth.users` and an RLS policy enforcing `owner_id = auth.uid()`. **Never** bypass this by using the service role key from a client-reachable path. The service role key is for migrations and webhooks only, and `SUPABASE_SERVICE_ROLE_KEY` must never be read from a browser client or a route that accepts user input without re-checking `owner_id`.

If you add a new user-owned table, it MUST have:
- `owner_id uuid not null references auth.users(id) on delete cascade`
- `alter table ... enable row level security`
- Four RLS policies (select, insert, update, delete) all enforcing `owner_id = auth.uid()`
- An index on `owner_id`
- `updated_at` trigger (already defined in `schema.sql`)

### 2. Real auth enforcement in layouts, not just proxy

Per Next 16 docs, `proxy.ts` is for optimistic checks only (session refresh, quick redirect). **Real authorization happens in layouts and server components** via `getUser()` from `@/lib/supabase/get-user`. Every page under `app/dashboard/` inherits the auth check from `app/dashboard/layout.tsx`. Don't skip this.

### 3. Never auto-commit secrets

The `.gitignore` already excludes `.env*` files. If you create new env files for any reason, verify they're gitignored before committing. Never paste a real API key into a committed file, even as a comment or example.

### 4. Fair housing safe harbor (for v2 AI features)

Any AI-powered decision layer that influences tenant approval, rent pricing for specific people, or any other housing-related decision MUST use the fair-housing safe-harbor pattern:

1. **Deterministic rules engine** makes the actual decision on legally-allowed signals (income ratio, credit score, verified evictions, employment stability, direct references)
2. **AI layer** provides summary / explanation / anomaly detection only — never the decision
3. **Human makes the final call**; AI output is labeled recommendation, not decision
4. **Never auto-reject** — unqualified prospects can still formally apply
5. **Always disclosed** with a fair-housing compliance note
6. **Always logged** for 3+ years (FCRA retention standard)

Forbidden signals: name-based ethnicity inference, address-based redlining, source-of-income filtering, anything correlated with a protected class (race, color, religion, sex, national origin, disability, familial status).

This is a hard line. If you're implementing any feature in this category, stop and verify with the founder before shipping. A fair housing attorney review is required before launching v2 AI features.

## Current sprint status

**Sprint 0 — scaffolding only (complete in the initial commit):**
- Next.js 16 project with TypeScript + Tailwind
- DB schema with 7 tables + RLS + triggers
- Supabase SSR clients (server, browser, proxy)
- Auth flow: sign-up, sign-in, sign-out, email verification callback
- Proxy for session refresh + optimistic route protection
- Dashboard layout with sidebar navigation
- Module placeholder pages (properties, tenants, rent, maintenance, prospects, renewals, financials) showing "Coming in Sprint N"

**Next up (Sprint 1):** Properties & units CRUD. Spec comes from CEP on Paperclip. Founder will paste it here when ready.

## How to run locally

```bash
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page renders even without Supabase configured — `getUser()` returns `null` on missing env vars. Sign-up / sign-in will fail gracefully until you configure `.env.local` and apply `db/schema.sql` in the Supabase SQL editor.

## Git + PR conventions

- Commit messages: conventional commits format (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`)
- Each sprint lands as one PR against `main`
- PR description should reference the sprint number and the CEP Paperclip issue that spec'd it
- Before committing: run `npm run lint` and `npx tsc --noEmit` to catch errors
- Never skip pre-commit hooks or push with `--no-verify` unless explicitly asked
- Always add `Co-Authored-By: Claude <noreply@anthropic.com>` to commit messages when you contribute substantial code (the runtime adds this automatically; don't override it)

## Debugging tips

- **Auth issues:** Check `getUser()` is returning what you expect. `createServerClient()` must be called inside a request context — don't hoist it to module scope.
- **Proxy issues:** `proxy.ts` needs to return the `response` object so cookies propagate. See `lib/supabase/proxy-client.ts` for the session-refresh pattern.
- **RLS blocking queries:** If queries return empty arrays when you expect data, check `owner_id = auth.uid()` is satisfied. The service role key bypasses RLS but shouldn't be used in app code.
- **Next 16 async API errors:** If you see "`cookies()` must be awaited" or similar, the call is synchronous and needs `await`. This is new in Next 16.

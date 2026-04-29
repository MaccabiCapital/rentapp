# Sprint: distribution features

Build the three top retention gaps from COMPETITOR-MATRIX.md:

1. **Listing syndication** — ILS XML feed that pushes vacancies to Zillow Rental Network, Apartments.com, Realtor.com, Rent.com, and 20+ other portals
2. **Accounting integrations** — CSV export (universal), QuickBooks Online (OAuth + sync), Xero (OAuth + sync)
3. **Public API v1** — REST API with per-landlord keys + webhooks for events

---

## Phase 1: Listing syndication

### Architecture

We do NOT integrate with each portal directly (Zillow, Apartments.com etc each have proprietary partner programs with portfolio minimums and approval delays). Instead we publish an **ILS-compliant XML feed** at a stable URL per landlord, and the aggregators crawl it daily.

Two formats matter in 2026:

- **RentalSource** (formerly RDF) — used by Apartments.com, Realtor.com, Rent.com, Trulia, Zumper. Most adopted.
- **Zillow ILS feed** — Zillow-specific format with Zillow-required fields.

We'll emit BOTH formats from the same source data, served at:

```
/api/syndication/feed/[token]/rentalsource.xml
/api/syndication/feed/[token]/zillow.xml
```

The token is a per-landlord opaque identifier (no auth header — the feed must be crawler-friendly). Token is generated when the landlord enables syndication and rotated on demand.

### DB

New table `syndication_feeds`:

```sql
create table public.syndication_feeds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  feed_token text not null unique,        -- 32-byte base64url
  is_active boolean not null default true,
  -- Tracking
  last_crawled_at timestamptz,
  last_crawled_user_agent text,
  total_crawl_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Plus we record per-portal subscriptions so the landlord can see which portals have crawled their feed:

```sql
create table public.syndication_portal_status (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references syndication_feeds(id) on delete cascade,
  portal_name text not null,              -- 'zillow', 'apartments_com', etc
  last_crawled_at timestamptz,
  total_listings_seen integer,
  unique (feed_id, portal_name)
);
```

### Admin UI

`/dashboard/listings/syndication` — panel showing:
- Feed enabled / disabled toggle
- Two URLs (RentalSource + Zillow) with copy buttons
- Submit-to-portal links: Zillow Rental Network signup form (deep link), Apartments.com partner form, Realtor.com partner form
- Last crawled by each portal
- Active listings being syndicated count

### Server

- `/api/syndication/feed/[token]/rentalsource.xml` — service-role read of all active listings for the owner the token belongs to, render as RentalSource XML
- `/api/syndication/feed/[token]/zillow.xml` — same but Zillow format
- Both endpoints: track crawl in `syndication_feeds` (last_crawled_at, user_agent), upsert `syndication_portal_status` row

### Marketing copy

> Push your listing to Zillow, Apartments.com, Realtor.com, Rent.com, Trulia, Zumper, and 15+ other portals — automatically. One feed, all the rentals sites that matter.

---

## Phase 2: Accounting integrations

### Sub-phases

**2a. CSV export (ship first)** — universal, works with QuickBooks Desktop, Xero, Wave, FreshBooks, custom GL, anything. Single 4-hour build.

**2b. QuickBooks Online OAuth + sync** — automated push of rent + late fees + expenses to QBO via Intuit's API.

**2c. Xero OAuth + sync** — same as 2b but Xero. Different OAuth provider, slightly different chart-of-accounts model.

(Wave/FreshBooks deferred — small market share, CSV export covers them.)

### Data to sync (in priority order)

| Source data | Maps to QBO | Maps to Xero |
|---|---|---|
| Rent payments collected | Income → "Rental Income" | Revenue → "Rental Income" |
| Late fees collected | Income → "Other Income — Late Fees" | Revenue → "Late Fees" |
| Security deposits received | Liability → "Tenant Deposits Held" | Liability → "Tenant Deposits" |
| Maintenance expenses paid | Expense → "Repairs & Maintenance" (per property class) | Expense → "Repairs & Maintenance" (per tracking category) |
| Insurance premiums | Expense → "Insurance" | Expense → "Insurance" |
| Stripe processing fees | Expense → "Bank Service Charges" | Expense → "Bank Charges" |

QBO supports "classes" for per-property tracking. Xero uses "tracking categories." We auto-create one per property on first sync.

### DB

```sql
create table public.accounting_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('quickbooks_online', 'xero')),
  -- OAuth credentials (encrypted at rest via Supabase vault — TBD)
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  realm_id text,                          -- QBO company id
  organization_id text,                   -- Xero tenant id
  -- Sync state
  last_synced_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  -- Mapping
  rent_account_id text,
  late_fees_account_id text,
  deposits_account_id text,
  maintenance_account_id text,
  insurance_account_id text,
  bank_charges_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, provider)
);

create table public.accounting_sync_log (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references accounting_connections(id) on delete cascade,
  source_table text not null,             -- 'rent_payments', 'late_fees', etc
  source_row_id uuid not null,
  external_id text,                       -- QBO/Xero transaction id
  synced_at timestamptz not null default now(),
  status text not null,                   -- 'success', 'error', 'skipped'
  error_message text,
  unique (connection_id, source_table, source_row_id)
);
```

### Admin UI

`/dashboard/settings/accounting` — tab inside Settings:
- Provider selector (CSV / QBO / Xero)
- For QBO/Xero: Connect button → OAuth flow → success
- Account mapping (auto-populated, editable)
- Manual "Sync now" button + last-synced timestamp
- Sync log table (last 50 events, status icons)

CSV export: a "Download CSV" button per date range. Format: standard general ledger CSV with Date, Account, Debit, Credit, Memo, Class columns — accountant-friendly.

### Background sync

A daily cron at `/api/cron/accounting-sync` that walks unsynced rows and pushes them to QBO/Xero. Idempotency key on each transaction prevents duplicates.

---

## Phase 3: Public API + webhooks

### API design

- Base URL: `https://app.rentbase.app/api/v1/`
- Auth: `Authorization: Bearer rb_live_<key>` header
- Format: JSON in/out
- Versioning: in URL, `/api/v1/`, future versions get `/api/v2/`
- Pagination: cursor-based, `?cursor=<opaque>&limit=50`
- Rate limit: 60 req/min per key, 10k/day, 429 on overage

### v1 endpoints (read-only first)

```
GET  /api/v1/properties
GET  /api/v1/properties/:id
GET  /api/v1/units
GET  /api/v1/units/:id
GET  /api/v1/tenants
GET  /api/v1/tenants/:id
GET  /api/v1/leases
GET  /api/v1/leases/:id
GET  /api/v1/prospects
GET  /api/v1/listings
GET  /api/v1/maintenance
GET  /api/v1/payments
GET  /api/v1/signatures
```

Add write endpoints (POST/PATCH/DELETE) in v1.1 once we see read traffic patterns.

### Webhooks

- `webhook_endpoints` table per owner (URL + secret + active)
- Events: `lease.signed`, `lease.fully_executed`, `rent.paid`, `rent.late`, `prospect.inquired`, `prospect.applied`, `maintenance.created`, `maintenance.resolved`
- Outbound HTTP POST with `X-Rentbase-Signature: sha256=...` HMAC header
- Retry: 1m, 5m, 30m, 2h, 12h then dead-letter
- Delivery log per webhook

### DB

```sql
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  -- Display: rb_live_xxxx (last 4 of secret)
  prefix text not null,                   -- 'rb_live_' or 'rb_test_'
  last_4 text not null,
  -- Auth: bcrypt hash of full secret
  secret_hash text not null,
  name text,                              -- user label
  scopes text[] not null default '{read}', -- 'read', 'write'
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  secret text not null,                   -- for HMAC signing
  events text[] not null,                 -- subset of allowed event names
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references webhook_endpoints(id) on delete cascade,
  event_name text not null,
  payload jsonb not null,
  status text not null,                   -- 'pending', 'delivered', 'failed', 'dead_lettered'
  http_status integer,
  response_body text,
  attempts integer not null default 0,
  next_attempt_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
```

### Admin UI

`/dashboard/settings/api` — tab inside Settings:
- Generate new key (with scope selection)
- Revoke key
- Webhook endpoints table (URL, events, last delivery, status)
- Add webhook button → URL + event selector
- Delivery log per webhook

### Pricing gate

API + webhooks are **Mid tier and up** ($80/mo+). Solo/Small don't need it; if they do, they upgrade.

---

## Order of work

1. **Phase 1 (Syndication)** — DB migration + feed routes + admin UI. ~3 hours. ✅ shipped
2. **Phase 2a (CSV)** — single export route + UI download button. ~1 hour. ✅ shipped
3. **Phase 2b (QBO OAuth + sync)** — biggest. OAuth flow + token refresh + sync engine + UI. ~6 hours.
4. **Phase 2c (Xero)** — adapter pattern matches 2b. ~3 hours.
5. **Phase 3a (API)** — key model + auth middleware + read endpoints + docs page. ~5 hours. ✅ shipped (5 endpoints; rest in v1.1)
6. **Phase 3b (Webhooks)** — endpoint + delivery + retry worker. ~4 hours.

Total: ~22 hours of focused work. Will land as 6 commits, one per phase.

Shipped this session: Phase 1, Phase 2a, Phase 3a. Phases 2b/2c/3b are
larger and need a follow-up session each.

---

## Deferred validation: Zillow feed acceptance test

The XML feeds are structurally correct (per `test/e2e/syndication.spec.ts`).
What we have NOT yet validated is whether Zillow's strict parser actually
accepts the format end-to-end. Two reasons to defer:

1. **No real listings yet.** The 2 active listings in our DB are smoke-test
   data. Pasting smoke-test addresses into Zillow's portal would either
   create real public ghost listings or get the feed flagged as low-quality.
2. **Zillow's partner program has portfolio minimums.** Some tiers require
   you to own 3+ rental properties before they'll start crawling. Worth
   confirming the rules at apply-time.

### When to revisit

Trigger condition: **Rentbase has its first paying landlord with 1+ real
active listing.** That landlord becomes the natural test bed:

1. Have them enable syndication in `/dashboard/listings/syndication`.
2. Take their **production Zillow feed URL** (the `zillow.xml` one) and
   paste it into Zillow's free feed validator at <https://www.zillow.com/rental-manager/feeds/>.
   Zillow's parser will report any field they expect that we're missing,
   any format they want differently, and any data validation errors (e.g.,
   `Bedrooms` must be 0-10, `Rent` must be positive integer, etc.).

3. Fix any gaps in `app/lib/syndication/xml-builders.ts` based on the
   validator output.

4. Submit the feed to Zillow Rental Network for approval. Approval
   typically takes 1–3 business days.

5. Once approved, watch `syndication_portal_status.last_crawled_at` to
   confirm crawls land. The user-agent → portal-name heuristic in
   `detectPortalFromUserAgent()` may need adjustment based on Zillow's
   actual UA string.

6. Repeat for Apartments.com partner portal (different submission URL,
   uses the `rentalsource.xml` feed).

### What to NOT do until we have a real listing

- Submit the test/smoke-data feed URL to any production aggregator
- Pay for a Zillow Rental Network paid tier
- Apply to Apartments.com partner program (requires existing portfolio)

### Risk we're carrying

If Zillow rejects our format on a field we didn't anticipate, we'll have
to ship a fix and lose a day on first-customer onboarding. To mitigate:
when we DO have a real listing, run the Zillow validator FIRST before
submitting for partner approval. Validator is free and instant; partner
approval takes days.

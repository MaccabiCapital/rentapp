-- ============================================================
-- Sprint 14 — Tenant portal access token
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- MVP tenant portal: no full Supabase-auth integration yet.
-- Landlord generates a signed, unguessable token; tenant visits
-- /portal/t/[token] and sees their lease, active notices, and
-- landlord contact info. Read-only for v1.
--
-- Regenerating the token revokes the old URL. Tenant gets a
-- new link. No password, no account.

alter table public.tenants
  add column if not exists portal_token text unique;

alter table public.tenants
  add column if not exists portal_token_generated_at timestamptz;

create index if not exists tenants_portal_token_idx
  on public.tenants (portal_token)
  where portal_token is not null;

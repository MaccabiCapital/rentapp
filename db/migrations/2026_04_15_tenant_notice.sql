-- ============================================================
-- Sprint 6 gutted — Tenant notice tracking
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Adds tenant_notice_given_on to leases so the renewals dashboard
-- can distinguish "tenant is leaving" from "lease ending, might renew"
-- and so the unit status can auto-sync to 'notice_given'.

alter table public.leases
  add column if not exists tenant_notice_given_on date;

create index if not exists leases_notice_idx
  on public.leases (tenant_notice_given_on)
  where deleted_at is null and tenant_notice_given_on is not null;

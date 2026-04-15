-- ============================================================
-- Sprint 10 — Property photos column
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Adds photos text[] to public.properties so every entity that
-- supports photo galleries uses the same shape. Matches the
-- existing columns on units and maintenance_requests.

alter table public.properties
  add column if not exists photos text[] default '{}';

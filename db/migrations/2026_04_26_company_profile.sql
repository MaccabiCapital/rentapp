-- ============================================================
-- Company profile — branding + business contact + default policies
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Extends the existing landlord_settings table (one row per
-- landlord, keyed by owner_id). Used by:
--   - All generated PDFs (criteria, notices, settlements, etc.)
--     for landlord name + address + footer
--   - Future: lease form pre-fills, email templates, dashboard theme
--
-- Creates a private storage bucket for logo uploads:
--   path scheme: {ownerId}/logo.{ext}

-- ------------------------------------------------------------
-- landlord_settings — additive columns
-- ------------------------------------------------------------

alter table public.landlord_settings
  -- Branding
  add column if not exists company_name text,
  add column if not exists logo_storage_path text,
  add column if not exists brand_color text,                -- e.g. '#4f46e5'
  add column if not exists website text,
  -- Business contact
  add column if not exists business_email text,
  add column if not exists business_phone text,
  add column if not exists business_street_address text,
  add column if not exists business_unit text,
  add column if not exists business_city text,
  add column if not exists business_state text,
  add column if not exists business_postal_code text,
  -- Default policies
  add column if not exists default_notice_period_days int,
  add column if not exists default_late_fee_amount numeric(10, 2),
  add column if not exists default_grace_period_days int,
  add column if not exists default_pet_policy text,
  add column if not exists business_hours text,
  add column if not exists quiet_hours text,
  add column if not exists emergency_contact text;

-- Logo storage bucket (private)
insert into storage.buckets (id, name, public)
values ('landlord-branding', 'landlord-branding', false)
on conflict (id) do nothing;

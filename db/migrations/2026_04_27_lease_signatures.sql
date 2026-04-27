-- ============================================================
-- Lease e-signatures
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Adds party-tracked signature events for leases. Tenants sign
-- via a token URL (no login required); landlords sign from the
-- authenticated dashboard. Both parties sign typed name + canvas-
-- drawn signature image (PNG in storage).
--
-- When both parties have signed, the lease's existing signed_at
-- column gets stamped by the action (existing column carries
-- forward; this table is the audit trail).
--
-- Token-based public sign flow:
--   1. Landlord clicks "Send for tenant signature" → server action
--      creates a row with status='pending', random token, expiry
--   2. Landlord shares the URL /lease-sign/{token} with tenant
--   3. Tenant signs → public action validates token, stores
--      signature image, captures IP + user agent, status='signed'
--   4. Token only works once (status flips to 'signed').

create type lease_signature_party as enum ('tenant', 'landlord')
;

create type lease_signature_status as enum (
  'pending',  -- awaiting party's signature
  'signed',   -- party has signed
  'voided'    -- landlord cancelled the request
);

create table public.lease_signatures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,

  party lease_signature_party not null,
  status lease_signature_status not null default 'pending',

  -- Authentication for tenant-side signing (token IS the credential).
  sign_token text,                     -- 32-char base64url; nullable for landlord rows
  token_expires_at timestamptz,        -- nullable for landlord rows

  -- Signature payload
  typed_name text,                     -- "I, {name}, agree..."
  signature_image_path text,           -- PNG in lease-signatures bucket
  signature_drawn_at timestamptz,      -- when the canvas signature was made

  -- Forensic capture (signature legitimacy)
  signed_at timestamptz,
  signed_ip text,
  signed_user_agent text,

  -- Optional: who voided + why
  voided_at timestamptz,
  voided_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lease_signatures_owner_idx
  on public.lease_signatures (owner_id);
create index lease_signatures_lease_idx
  on public.lease_signatures (lease_id);
create index lease_signatures_token_idx
  on public.lease_signatures (sign_token)
  where sign_token is not null and status = 'pending';

alter table public.lease_signatures enable row level security;

-- Owner CRUD via session client (dashboard).
create policy "owners select on lease_signatures"
  on public.lease_signatures for select using (owner_id = auth.uid());
create policy "owners insert on lease_signatures"
  on public.lease_signatures for insert with check (owner_id = auth.uid());
create policy "owners update on lease_signatures"
  on public.lease_signatures for update using (owner_id = auth.uid());
create policy "owners delete on lease_signatures"
  on public.lease_signatures for delete using (owner_id = auth.uid());

create trigger set_updated_at_lease_signatures
  before update on public.lease_signatures
  for each row execute function public.set_updated_at();

-- Storage bucket for signature PNGs (private; signed URLs only).
insert into storage.buckets (id, name, public)
values ('lease-signatures', 'lease-signatures', false)
on conflict (id) do nothing;

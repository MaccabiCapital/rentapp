-- ============================================================
-- Sprint 14 — Renters (tenant) insurance tracking
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Distinct from public.insurance_policies (landlord-side liability
-- + umbrella policies). This table tracks RENTERS insurance — the
-- tenant's own policy that landlords typically require as a lease
-- condition but have no easy way to enforce.
--
-- One policy per tenant per effective period. Tie to lease_id
-- when known; nullable because a tenant may carry a standing
-- policy that spans multiple leases or renewals.
--
-- Document upload lives in the existing rentapp-photos bucket
-- under a `renters_insurance/{policy_id}/` path convention (the
-- app-level upload flow adds the docs through the generic photos
-- storage helper — no new bucket needed).

create table public.renters_insurance_policies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lease_id uuid references public.leases(id) on delete set null,

  carrier text not null,
  policy_number text,

  liability_coverage numeric(12,2),
  personal_property_coverage numeric(12,2),
  annual_premium numeric(10,2),

  effective_date date,
  expiry_date date not null,

  -- Path in rentapp-photos storage bucket, or external URL.
  document_url text,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index renters_insurance_owner_idx
  on public.renters_insurance_policies (owner_id) where deleted_at is null;
create index renters_insurance_tenant_idx
  on public.renters_insurance_policies (tenant_id) where deleted_at is null;
create index renters_insurance_lease_idx
  on public.renters_insurance_policies (lease_id) where deleted_at is null;
create index renters_insurance_expiry_idx
  on public.renters_insurance_policies (expiry_date) where deleted_at is null;

alter table public.renters_insurance_policies enable row level security;

create policy "owner can select own renters insurance"
  on public.renters_insurance_policies for select to authenticated
  using (owner_id = auth.uid());
create policy "owner can insert own renters insurance"
  on public.renters_insurance_policies for insert to authenticated
  with check (owner_id = auth.uid());
create policy "owner can update own renters insurance"
  on public.renters_insurance_policies for update to authenticated
  using (owner_id = auth.uid());
create policy "owner can delete own renters insurance"
  on public.renters_insurance_policies for delete to authenticated
  using (owner_id = auth.uid());

create trigger set_updated_at before update on public.renters_insurance_policies
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- Lease-level policy: does this lease require renters insurance?
-- ------------------------------------------------------------
--
-- Defaulted TRUE because most lease templates include this as a
-- standard clause. Landlord can uncheck per-lease.

alter table public.leases
  add column if not exists requires_renters_insurance boolean not null default true;

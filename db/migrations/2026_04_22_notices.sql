-- ============================================================
-- Sprint 14 — State legal notices
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Generated notices tied to a lease. One row per generated
-- notice — a rent-increase letter, entry notice, late notice,
-- cure-or-quit, or termination notice.
--
-- Data is stored as JSONB because each notice type has a
-- different shape. Zod schemas in app/lib/schemas/notice.ts
-- validate before insert. Templates in app/ui/notice-pdf.tsx
-- fill state-specific legal text.
--
-- THIS IS NOT LEGAL ADVICE. Every generated PDF carries a
-- "DRAFT — have an attorney in your state review before serving"
-- banner, same pattern as the compliance page disclaimer.

create type notice_type as enum (
  'rent_increase',
  'entry',
  'late_rent',
  'cure_or_quit',
  'terminate_tenancy'
);

create type notice_method as enum (
  'hand_delivery',
  'mail',
  'certified_mail',
  'email',
  'posting',
  'other'
);

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,

  type notice_type not null,

  -- Notice-specific fields as JSON. Zod validates shape per-type.
  data jsonb not null default '{}'::jsonb,

  -- Tracking when / how it was actually served. Optional — a
  -- landlord may generate a draft days before serving.
  served_at timestamptz,
  served_method notice_method,

  -- Free-form notes (e.g. "delivered in person, tenant refused")
  notes text,

  generated_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index notices_owner_idx
  on public.notices (owner_id) where deleted_at is null;
create index notices_lease_idx
  on public.notices (lease_id) where deleted_at is null;
create index notices_type_idx
  on public.notices (type) where deleted_at is null;
create index notices_served_idx
  on public.notices (served_at) where deleted_at is null;

alter table public.notices enable row level security;

create policy "owner can select own notices"
  on public.notices for select to authenticated
  using (owner_id = auth.uid());
create policy "owner can insert own notices"
  on public.notices for insert to authenticated
  with check (owner_id = auth.uid());
create policy "owner can update own notices"
  on public.notices for update to authenticated
  using (owner_id = auth.uid());
create policy "owner can delete own notices"
  on public.notices for delete to authenticated
  using (owner_id = auth.uid());

create trigger set_updated_at before update on public.notices
  for each row execute procedure public.set_updated_at();

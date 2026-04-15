-- ============================================================
-- Sprint 11 — Public listings for vacant units
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Creates the `listings` table plus the public read policy,
-- plus a trigger that auto-deactivates a unit's listing when
-- the unit status flips to 'occupied'.

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.units(id) on delete cascade,

  -- URL-safe unique slug. Generated from property name by the
  -- app on create. If we ever hit a collision, we append -2, -3.
  slug text not null unique,

  -- Landlord-editable marketing copy
  title text not null,
  description text,
  headline_rent numeric(10,2),
  available_on date,

  -- Contact
  contact_email text,
  contact_phone text,

  -- State
  is_active boolean not null default true,

  -- Simple counters (Sprint 11 MVP — no separate views table)
  view_count int not null default 0,
  inquiry_count int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index listings_owner_idx on public.listings (owner_id) where deleted_at is null;
create index listings_unit_idx on public.listings (unit_id) where deleted_at is null;
create index listings_slug_idx on public.listings (slug) where deleted_at is null;
create index listings_active_idx on public.listings (is_active) where deleted_at is null;

alter table public.listings enable row level security;

-- Owner can CRUD their own listings
create policy "owner can select own listings"
  on public.listings for select
  to authenticated
  using (owner_id = auth.uid());
create policy "owner can insert own listings"
  on public.listings for insert
  to authenticated
  with check (owner_id = auth.uid());
create policy "owner can update own listings"
  on public.listings for update
  to authenticated
  using (owner_id = auth.uid());
create policy "owner can delete own listings"
  on public.listings for delete
  to authenticated
  using (owner_id = auth.uid());

-- PUBLIC read policy — anyone (including anon) can SELECT an
-- active, non-deleted listing by slug. This is what makes the
-- public /listings/[slug] page work without auth.
create policy "public can select active listings"
  on public.listings for select
  to anon, authenticated
  using (is_active = true and deleted_at is null);

create trigger set_updated_at before update on public.listings
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- Auto-deactivate listings when unit becomes occupied
-- ------------------------------------------------------------
create or replace function public.deactivate_listings_on_occupancy()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'occupied' and (old.status is distinct from 'occupied') then
    update public.listings
      set is_active = false
      where unit_id = new.id
        and is_active = true
        and deleted_at is null;
  end if;
  return new;
end;
$$;

create trigger deactivate_listings_on_unit_occupancy
  after update on public.units
  for each row
  execute procedure public.deactivate_listings_on_occupancy();

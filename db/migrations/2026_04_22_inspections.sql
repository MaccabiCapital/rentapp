-- ============================================================
-- Sprint 14 — Move-in / move-out inspections
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Photo-backed room-by-room inspection records tied to a lease.
-- Primary use case: prevent security-deposit disputes at move-
-- out by having a signed, timestamped record of unit condition
-- at move-in to compare against.
--
-- Two tables:
--   inspections       — header (one per inspection event)
--   inspection_items  — line items (one per room/item checked)
--
-- Photos live on inspection_items.photos as a text[] of storage
-- paths, following the same convention as units/properties/
-- maintenance_requests. Extend app/lib/storage/photos.ts to add
-- 'inspection_items' as a new PhotoEntityType.

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------

create type inspection_type as enum (
  'move_in',
  'move_out',
  'periodic'        -- mid-lease walkthroughs, post-repair, annual
);

create type inspection_status as enum (
  'draft',          -- created, no items rated yet
  'in_progress',    -- some items rated
  'completed',      -- all items rated, landlord done
  'signed'          -- tenant signed too
);

create type item_condition as enum (
  'excellent',
  'good',
  'fair',
  'poor',
  'damaged'
);

-- ------------------------------------------------------------
-- Inspection header
-- ------------------------------------------------------------

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,

  type inspection_type not null,
  status inspection_status not null default 'draft',

  scheduled_for date,
  completed_at timestamptz,

  -- Signature capture. Simple "typed name + timestamp" for v1;
  -- upgrade to drawn-signature / DocuSign later if needed.
  tenant_signed_at timestamptz,
  tenant_signature_name text,
  landlord_signed_at timestamptz,
  landlord_signature_name text,

  pdf_url text,                      -- generated final report
  notes text,                        -- inspector overall notes

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index inspections_owner_idx
  on public.inspections (owner_id) where deleted_at is null;
create index inspections_lease_idx
  on public.inspections (lease_id) where deleted_at is null;
create index inspections_type_idx
  on public.inspections (type) where deleted_at is null;
create index inspections_status_idx
  on public.inspections (status) where deleted_at is null;

alter table public.inspections enable row level security;

create policy "owner can select own inspections"
  on public.inspections for select to authenticated
  using (owner_id = auth.uid());
create policy "owner can insert own inspections"
  on public.inspections for insert to authenticated
  with check (owner_id = auth.uid());
create policy "owner can update own inspections"
  on public.inspections for update to authenticated
  using (owner_id = auth.uid());
create policy "owner can delete own inspections"
  on public.inspections for delete to authenticated
  using (owner_id = auth.uid());

create trigger set_updated_at before update on public.inspections
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- Inspection line items (one row per room/item)
-- ------------------------------------------------------------

create table public.inspection_items (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,

  room text not null,                -- e.g. 'Kitchen', 'Bedroom 1', 'Exterior'
  item text not null,                -- e.g. 'Refrigerator', 'Walls', 'Front door'
  condition item_condition,          -- null = not yet rated
  notes text,
  photos text[] not null default '{}'::text[],

  sort_order int not null default 0, -- preserve landlord's ordering

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inspection_items_inspection_idx
  on public.inspection_items (inspection_id);

alter table public.inspection_items enable row level security;

-- Item-level policies check ownership via the parent inspection,
-- same pattern as policy_properties junction.
create policy "owner can select own inspection_items"
  on public.inspection_items for select to authenticated
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_items.inspection_id
        and i.owner_id = auth.uid()
    )
  );
create policy "owner can insert own inspection_items"
  on public.inspection_items for insert to authenticated
  with check (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_items.inspection_id
        and i.owner_id = auth.uid()
    )
  );
create policy "owner can update own inspection_items"
  on public.inspection_items for update to authenticated
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_items.inspection_id
        and i.owner_id = auth.uid()
    )
  );
create policy "owner can delete own inspection_items"
  on public.inspection_items for delete to authenticated
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_items.inspection_id
        and i.owner_id = auth.uid()
    )
  );

create trigger set_updated_at before update on public.inspection_items
  for each row execute procedure public.set_updated_at();

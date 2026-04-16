-- ============================================================
-- Sprint 12 — Insurance policies
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- One policy can cover multiple properties via the junction
-- table. Umbrella and portfolio-bundled policies work cleanly.
-- Individual per-property policies just have one junction row.

create type policy_type as enum (
  'landlord',
  'umbrella',
  'flood',
  'earthquake',
  'rent_loss',
  'other'
);

create table public.insurance_policies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  team_member_id uuid references public.team_members(id) on delete set null,

  carrier text not null,
  policy_number text,
  policy_type policy_type not null default 'landlord',

  coverage_amount numeric(12,2),
  liability_limit numeric(12,2),
  annual_premium numeric(10,2),
  deductible numeric(10,2),

  effective_date date,
  expiry_date date not null,
  renewal_date date,
  auto_renewal boolean not null default false,

  notes text,
  document_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index insurance_owner_idx on public.insurance_policies (owner_id) where deleted_at is null;
create index insurance_expiry_idx on public.insurance_policies (expiry_date) where deleted_at is null;
create index insurance_type_idx on public.insurance_policies (policy_type) where deleted_at is null;
create index insurance_team_idx on public.insurance_policies (team_member_id) where deleted_at is null;

-- Many-to-many junction between policies and properties
create table public.policy_properties (
  policy_id uuid not null references public.insurance_policies(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  primary key (policy_id, property_id)
);

create index policy_properties_property_idx on public.policy_properties (property_id);

alter table public.insurance_policies enable row level security;
alter table public.policy_properties enable row level security;

create policy "owner can select own policies"
  on public.insurance_policies for select to authenticated
  using (owner_id = auth.uid());
create policy "owner can insert own policies"
  on public.insurance_policies for insert to authenticated
  with check (owner_id = auth.uid());
create policy "owner can update own policies"
  on public.insurance_policies for update to authenticated
  using (owner_id = auth.uid());
create policy "owner can delete own policies"
  on public.insurance_policies for delete to authenticated
  using (owner_id = auth.uid());

-- Junction: policy ownership is checked via the parent policy's owner_id
create policy "owner can select own policy_properties"
  on public.policy_properties for select to authenticated
  using (
    exists (
      select 1 from public.insurance_policies p
      where p.id = policy_properties.policy_id and p.owner_id = auth.uid()
    )
  );
create policy "owner can insert own policy_properties"
  on public.policy_properties for insert to authenticated
  with check (
    exists (
      select 1 from public.insurance_policies p
      where p.id = policy_properties.policy_id and p.owner_id = auth.uid()
    )
  );
create policy "owner can delete own policy_properties"
  on public.policy_properties for delete to authenticated
  using (
    exists (
      select 1 from public.insurance_policies p
      where p.id = policy_properties.policy_id and p.owner_id = auth.uid()
    )
  );

create trigger set_updated_at before update on public.insurance_policies
  for each row execute procedure public.set_updated_at();

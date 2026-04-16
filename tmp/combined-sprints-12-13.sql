-- ============================================================
-- Combined migration: Sprints 12 + 13 — rentapp
-- ============================================================
--
-- Paste into Supabase SQL Editor → Run.
-- Idempotent: every CREATE is guarded. Safe to re-run.

-- ------------------------------------------------------------
-- Enums (guarded)
-- ------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'policy_type') then
    create type policy_type as enum (
      'landlord', 'umbrella', 'flood', 'earthquake', 'rent_loss', 'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'rent_schedule_status') then
    create type rent_schedule_status as enum (
      'upcoming', 'due', 'paid', 'partial', 'overdue', 'skipped'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'comm_entity_type') then
    create type comm_entity_type as enum (
      'tenant', 'prospect', 'team_member', 'maintenance_request', 'lease', 'triage'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'comm_direction') then
    create type comm_direction as enum ('inbound', 'outbound');
  end if;
  if not exists (select 1 from pg_type where typname = 'comm_channel') then
    create type comm_channel as enum ('sms', 'call', 'email', 'whatsapp', 'note');
  end if;
  if not exists (select 1 from pg_type where typname = 'line_type') then
    create type line_type as enum ('leasing', 'support');
  end if;
  if not exists (select 1 from pg_type where typname = 'line_status') then
    create type line_status as enum ('pending', 'active', 'suspended');
  end if;
end$$;

-- ------------------------------------------------------------
-- insurance_policies + policy_properties (Sprint 12 A)
-- ------------------------------------------------------------

create table if not exists public.insurance_policies (
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

create index if not exists insurance_owner_idx
  on public.insurance_policies (owner_id) where deleted_at is null;
create index if not exists insurance_expiry_idx
  on public.insurance_policies (expiry_date) where deleted_at is null;
create index if not exists insurance_type_idx
  on public.insurance_policies (policy_type) where deleted_at is null;
create index if not exists insurance_team_idx
  on public.insurance_policies (team_member_id) where deleted_at is null;

create table if not exists public.policy_properties (
  policy_id uuid not null references public.insurance_policies(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  primary key (policy_id, property_id)
);

create index if not exists policy_properties_property_idx
  on public.policy_properties (property_id);

alter table public.insurance_policies enable row level security;
alter table public.policy_properties enable row level security;

drop policy if exists "owner can select own insurance" on public.insurance_policies;
create policy "owner can select own insurance"
  on public.insurance_policies for select to authenticated using (owner_id = auth.uid());
drop policy if exists "owner can insert own insurance" on public.insurance_policies;
create policy "owner can insert own insurance"
  on public.insurance_policies for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "owner can update own insurance" on public.insurance_policies;
create policy "owner can update own insurance"
  on public.insurance_policies for update to authenticated using (owner_id = auth.uid());
drop policy if exists "owner can delete own insurance" on public.insurance_policies;
create policy "owner can delete own insurance"
  on public.insurance_policies for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "owner can select own policy_properties" on public.policy_properties;
create policy "owner can select own policy_properties"
  on public.policy_properties for select to authenticated
  using (
    exists (
      select 1 from public.insurance_policies p
      where p.id = policy_properties.policy_id
        and p.owner_id = auth.uid()
    )
  );
drop policy if exists "owner can insert own policy_properties" on public.policy_properties;
create policy "owner can insert own policy_properties"
  on public.policy_properties for insert to authenticated
  with check (
    exists (
      select 1 from public.insurance_policies p
      where p.id = policy_properties.policy_id
        and p.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.properties pr
      where pr.id = policy_properties.property_id
        and pr.owner_id = auth.uid()
    )
  );
drop policy if exists "owner can delete own policy_properties" on public.policy_properties;
create policy "owner can delete own policy_properties"
  on public.policy_properties for delete to authenticated
  using (
    exists (
      select 1 from public.insurance_policies p
      where p.id = policy_properties.policy_id
        and p.owner_id = auth.uid()
    )
  );

drop trigger if exists set_updated_at on public.insurance_policies;
create trigger set_updated_at before update on public.insurance_policies
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- rent_schedules (Sprint 12 B)
-- ------------------------------------------------------------

create table if not exists public.rent_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,
  due_date date not null,
  amount numeric(10,2) not null,
  paid_amount numeric(10,2) not null default 0,
  status rent_schedule_status not null default 'upcoming',
  method text,
  payment_id uuid references public.payments(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (lease_id, due_date)
);

create index if not exists rent_schedules_owner_idx
  on public.rent_schedules (owner_id) where deleted_at is null;
create index if not exists rent_schedules_lease_idx
  on public.rent_schedules (lease_id, due_date) where deleted_at is null;
create index if not exists rent_schedules_due_idx
  on public.rent_schedules (due_date) where deleted_at is null;
create index if not exists rent_schedules_status_idx
  on public.rent_schedules (status) where deleted_at is null;

alter table public.rent_schedules enable row level security;

drop policy if exists "owner can select own rent_schedules" on public.rent_schedules;
create policy "owner can select own rent_schedules"
  on public.rent_schedules for select to authenticated using (owner_id = auth.uid());
drop policy if exists "owner can insert own rent_schedules" on public.rent_schedules;
create policy "owner can insert own rent_schedules"
  on public.rent_schedules for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "owner can update own rent_schedules" on public.rent_schedules;
create policy "owner can update own rent_schedules"
  on public.rent_schedules for update to authenticated using (owner_id = auth.uid());
drop policy if exists "owner can delete own rent_schedules" on public.rent_schedules;
create policy "owner can delete own rent_schedules"
  on public.rent_schedules for delete to authenticated using (owner_id = auth.uid());

drop trigger if exists set_updated_at on public.rent_schedules;
create trigger set_updated_at before update on public.rent_schedules
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- communications + ownership helper (Sprint 13 A)
-- ------------------------------------------------------------

create table if not exists public.communications (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  entity_type  comm_entity_type not null,
  entity_id    uuid not null,
  direction    comm_direction not null,
  channel      comm_channel not null,
  content      text not null,
  external_id  text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  created_by   text not null default 'user',
  deleted_at   timestamptz
);

create index if not exists communications_timeline_idx
  on public.communications (entity_type, entity_id, created_at desc)
  where deleted_at is null;
create index if not exists communications_owner_idx
  on public.communications (owner_id)
  where deleted_at is null;
create index if not exists communications_external_id_idx
  on public.communications (external_id)
  where deleted_at is null and external_id is not null;

create or replace function public.comm_entity_owned_by(
  p_entity_type comm_entity_type,
  p_entity_id   uuid,
  p_owner_id    uuid
) returns boolean
  language sql
  stable
  security invoker
  set search_path = ''
as $$
  select case p_entity_type
    when 'tenant' then exists (
      select 1 from public.tenants
      where id = p_entity_id and owner_id = p_owner_id and deleted_at is null
    )
    when 'prospect' then exists (
      select 1 from public.prospects
      where id = p_entity_id and owner_id = p_owner_id and deleted_at is null
    )
    when 'team_member' then exists (
      select 1 from public.team_members
      where id = p_entity_id and owner_id = p_owner_id and deleted_at is null
    )
    when 'maintenance_request' then exists (
      select 1 from public.maintenance_requests
      where id = p_entity_id and owner_id = p_owner_id
    )
    when 'lease' then exists (
      select 1 from public.leases
      where id = p_entity_id and owner_id = p_owner_id and deleted_at is null
    )
    when 'triage' then p_entity_id = p_owner_id
  end
$$;

alter table public.communications enable row level security;

drop policy if exists "owner can select own communications" on public.communications;
create policy "owner can select own communications"
  on public.communications for select to authenticated
  using (owner_id = auth.uid());
drop policy if exists "owner can insert own communications" on public.communications;
create policy "owner can insert own communications"
  on public.communications for insert to authenticated
  with check (
    owner_id = auth.uid()
    and public.comm_entity_owned_by(entity_type, entity_id, auth.uid())
  );
drop policy if exists "owner can update own communications" on public.communications;
create policy "owner can update own communications"
  on public.communications for update to authenticated
  using (owner_id = auth.uid());
drop policy if exists "owner can delete own communications" on public.communications;
create policy "owner can delete own communications"
  on public.communications for delete to authenticated
  using (owner_id = auth.uid());

-- ------------------------------------------------------------
-- landlord_phone_lines (Sprint 13 B)
-- ------------------------------------------------------------

create table if not exists public.landlord_phone_lines (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references auth.users(id) on delete cascade,
  line_type             line_type not null,
  twilio_number         text,
  retell_agent_id       text,
  retell_webhook_secret text,
  status                line_status not null default 'pending',
  a2p_brand_id          text,
  a2p_campaign_id       text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (owner_id, line_type)
);

create index if not exists phone_lines_owner_idx
  on public.landlord_phone_lines (owner_id);
create unique index if not exists phone_lines_twilio_number_uidx
  on public.landlord_phone_lines (twilio_number)
  where twilio_number is not null;

alter table public.landlord_phone_lines enable row level security;

drop policy if exists "owner can select own phone lines" on public.landlord_phone_lines;
create policy "owner can select own phone lines"
  on public.landlord_phone_lines for select to authenticated
  using (owner_id = auth.uid());
drop policy if exists "owner can insert own phone lines" on public.landlord_phone_lines;
create policy "owner can insert own phone lines"
  on public.landlord_phone_lines for insert to authenticated
  with check (owner_id = auth.uid());
drop policy if exists "owner can update own phone lines" on public.landlord_phone_lines;
create policy "owner can update own phone lines"
  on public.landlord_phone_lines for update to authenticated
  using (owner_id = auth.uid());

drop trigger if exists set_updated_at on public.landlord_phone_lines;
create trigger set_updated_at before update on public.landlord_phone_lines
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- tenant_sms_identities (Sprint 13 B)
-- ------------------------------------------------------------

create table if not exists public.tenant_sms_identities (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  phone_number        text not null,
  verified_at         timestamptz,
  verification_method text,
  created_at          timestamptz not null default now(),
  unique (owner_id, phone_number)
);

create index if not exists tenant_sms_identities_tenant_idx
  on public.tenant_sms_identities (tenant_id);
create index if not exists tenant_sms_identities_phone_idx
  on public.tenant_sms_identities (owner_id, phone_number);

alter table public.tenant_sms_identities enable row level security;

drop policy if exists "owner can select own sms identities" on public.tenant_sms_identities;
create policy "owner can select own sms identities"
  on public.tenant_sms_identities for select to authenticated
  using (owner_id = auth.uid());
drop policy if exists "owner can insert own sms identities" on public.tenant_sms_identities;
create policy "owner can insert own sms identities"
  on public.tenant_sms_identities for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.tenants
      where id = tenant_id and owner_id = auth.uid() and deleted_at is null
    )
  );
drop policy if exists "owner can delete own sms identities" on public.tenant_sms_identities;
create policy "owner can delete own sms identities"
  on public.tenant_sms_identities for delete to authenticated
  using (owner_id = auth.uid());

-- ------------------------------------------------------------
-- retell_webhook_events (Sprint 13 B) — service role only
-- ------------------------------------------------------------

create table if not exists public.retell_webhook_events (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  event_type    text not null,
  external_id   text not null,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  process_error text,
  unique (owner_id, event_type, external_id)
);

create index if not exists retell_webhook_events_unprocessed_idx
  on public.retell_webhook_events (received_at desc)
  where processed_at is null;

alter table public.retell_webhook_events enable row level security;
-- no policies = authenticated clients have no access. Webhook route
-- uses the service-role client which bypasses RLS.

-- ============================================================
-- Done.
-- ============================================================

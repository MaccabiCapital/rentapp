-- ============================================================
-- communications — polymorphic activity log (Sprint 13a)
-- ============================================================
--
-- Single log table for every inbound/outbound interaction with
-- tenants, prospects, team members, maintenance requests, and
-- leases. Foundation for Sprint 13b's Retell SMS pipeline.
--
-- Polymorphism: entity_type + entity_id point at any of the five
-- CRM-like entities. A helper function enforces that the pointed-to
-- entity is owned by auth.uid() so a user can't log against
-- someone else's tenant.
--
-- 'triage' is included now even though no code writes it yet.
-- Sprint 13b uses it for inbound SMS from phone numbers we can't
-- resolve to a known tenant. Adding enum variants to a live
-- enum requires a second migration, so we bake it in up front.

create type comm_entity_type as enum (
  'tenant',
  'prospect',
  'team_member',
  'maintenance_request',
  'lease',
  'triage'
);

create type comm_direction as enum ('inbound', 'outbound');

create type comm_channel as enum (
  'sms',
  'call',
  'email',
  'whatsapp',
  'note'
);

create table public.communications (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  entity_type  comm_entity_type not null,
  -- entity_id has no FK because the referenced table varies. The
  -- comm_entity_owned_by() helper enforces the ownership link
  -- on insert via the RLS policy.
  entity_id    uuid not null,
  direction    comm_direction not null,
  channel      comm_channel not null,
  content      text not null,
  -- external_id correlates to the upstream system. For Retell it's
  -- the chat_id; for Twilio it's the message_sid; nullable for
  -- manually-logged entries.
  external_id  text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  -- 'user' (default, logged via dashboard), 'system' (cron/trigger),
  -- 'webhook' (Retell chat_analyzed etc.)
  created_by   text not null default 'user',
  deleted_at   timestamptz
);

-- Timelines always filter by (entity_type, entity_id) and sort
-- by created_at DESC. This index covers both list + count queries.
create index communications_timeline_idx
  on public.communications (entity_type, entity_id, created_at desc)
  where deleted_at is null;

create index communications_owner_idx
  on public.communications (owner_id)
  where deleted_at is null;

-- External id lookup for webhook idempotency (dedupe inbound
-- messages before side effects).
create index communications_external_id_idx
  on public.communications (external_id)
  where deleted_at is null and external_id is not null;

-- ------------------------------------------------------------
-- Ownership helper — RLS can't do polymorphic joins directly, so
-- we look up ownership of the pointed-to entity in a SECURITY
-- INVOKER function. The function reads through the caller's own
-- RLS policies, which means it respects row visibility.
-- ------------------------------------------------------------
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
      where id = p_entity_id
        and owner_id = p_owner_id
        and deleted_at is null
    )
    when 'prospect' then exists (
      select 1 from public.prospects
      where id = p_entity_id
        and owner_id = p_owner_id
        and deleted_at is null
    )
    when 'team_member' then exists (
      select 1 from public.team_members
      where id = p_entity_id
        and owner_id = p_owner_id
        and deleted_at is null
    )
    when 'maintenance_request' then exists (
      select 1 from public.maintenance_requests
      where id = p_entity_id
        and owner_id = p_owner_id
    )
    when 'lease' then exists (
      select 1 from public.leases
      where id = p_entity_id
        and owner_id = p_owner_id
        and deleted_at is null
    )
    -- 'triage' rows aren't scoped to a concrete entity — the
    -- entity_id stores the owner_id by convention. We accept any
    -- row where entity_id matches the caller's uid.
    when 'triage' then p_entity_id = p_owner_id
  end
$$;

alter table public.communications enable row level security;

create policy "owner can select own communications"
  on public.communications for select to authenticated
  using (owner_id = auth.uid());

create policy "owner can insert own communications"
  on public.communications for insert to authenticated
  with check (
    owner_id = auth.uid()
    and public.comm_entity_owned_by(entity_type, entity_id, auth.uid())
  );

create policy "owner can update own communications"
  on public.communications for update to authenticated
  using (owner_id = auth.uid());

create policy "owner can delete own communications"
  on public.communications for delete to authenticated
  using (owner_id = auth.uid());

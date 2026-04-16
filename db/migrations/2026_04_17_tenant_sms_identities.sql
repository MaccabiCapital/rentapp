-- ============================================================
-- tenant_sms_identities — phone_number → tenant_id resolver (13b)
-- ============================================================
--
-- When an SMS lands at the support webhook, we resolve the
-- inbound phone number to a tenant by looking up this table.
-- Multiple phones per tenant are allowed (primary + partner,
-- new number after a carrier switch, etc.) but a single phone
-- can only belong to one tenant per landlord namespace.
--
-- Seeded manually by the landlord in the first pass. Sprint 13c
-- adds a triage flow that creates rows retroactively when the
-- landlord assigns a triage message to a known tenant.

create table public.tenant_sms_identities (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  -- Stored E.164 (e.g. +16175550123). Normalization happens in
  -- app/lib/phone.ts before any insert.
  phone_number        text not null,
  verified_at         timestamptz,
  -- 'manual' — landlord added via dashboard form
  -- 'triage_assign' — landlord assigned an inbound message to a tenant
  -- 'lease_import' — imported from lease data (future)
  verification_method text,
  created_at          timestamptz not null default now(),
  unique (owner_id, phone_number)
);

create index tenant_sms_identities_tenant_idx
  on public.tenant_sms_identities (tenant_id);
create index tenant_sms_identities_phone_idx
  on public.tenant_sms_identities (owner_id, phone_number);

alter table public.tenant_sms_identities enable row level security;

create policy "owner can select own sms identities"
  on public.tenant_sms_identities for select to authenticated
  using (owner_id = auth.uid());
create policy "owner can insert own sms identities"
  on public.tenant_sms_identities for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.tenants
      where id = tenant_id and owner_id = auth.uid() and deleted_at is null
    )
  );
create policy "owner can delete own sms identities"
  on public.tenant_sms_identities for delete to authenticated
  using (owner_id = auth.uid());

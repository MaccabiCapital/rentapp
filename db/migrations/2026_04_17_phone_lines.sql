-- ============================================================
-- landlord_phone_lines — per-landlord SMS/voice line (Sprint 13b)
-- ============================================================
--
-- Each landlord provisions their own Retell chat agent + Twilio
-- number for the tenant support line (and later, a separate row
-- for the leasing line). Tenancy is enforced at our app layer —
-- Retell doesn't do sub-accounts.
--
-- `status='pending'` is the default while Twilio is provisioning
-- the number and A2P 10DLC brand/campaign registration is making
-- its way through the carrier pipeline (hours to weeks). The row
-- flips to `'active'` once everything lands. See docs/SPRINT-13-NEEDS.md.

create type line_type as enum ('leasing', 'support');
create type line_status as enum ('pending', 'active', 'suspended');

create table public.landlord_phone_lines (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references auth.users(id) on delete cascade,
  line_type             line_type not null,
  -- twilio_number is null while still provisioning
  twilio_number         text,
  retell_agent_id       text,
  -- HMAC secret for the Retell webhook. Rotated by regenerating;
  -- Retell is told the new secret via their API.
  retell_webhook_secret text,
  status                line_status not null default 'pending',
  a2p_brand_id          text,
  a2p_campaign_id       text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (owner_id, line_type)
);

create index phone_lines_owner_idx on public.landlord_phone_lines (owner_id);
create unique index phone_lines_twilio_number_uidx
  on public.landlord_phone_lines (twilio_number)
  where twilio_number is not null;

alter table public.landlord_phone_lines enable row level security;

-- Dashboard reads go through RLS. The webhook route uses the
-- service role client because inbound requests are unauthenticated.
create policy "owner can select own phone lines"
  on public.landlord_phone_lines for select to authenticated
  using (owner_id = auth.uid());
create policy "owner can insert own phone lines"
  on public.landlord_phone_lines for insert to authenticated
  with check (owner_id = auth.uid());
create policy "owner can update own phone lines"
  on public.landlord_phone_lines for update to authenticated
  using (owner_id = auth.uid());
-- No delete policy: landlords must suspend instead of hard-delete
-- so we keep the audit trail of what number belonged to whom.

create trigger set_updated_at before update on public.landlord_phone_lines
  for each row execute procedure public.set_updated_at();

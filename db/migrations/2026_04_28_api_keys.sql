-- ============================================================
-- Public API keys
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- One row per API key a landlord generates. The `secret_hash`
-- stores a bcrypt hash of the full secret; we never store the
-- plaintext after creation. The landlord sees the full key
-- exactly once at generation time and is told to copy it.
--
-- Display format:  rb_live_<26 random base64url chars>
-- We display rb_live_••••••••<last_4> in the dashboard for
-- identification.

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  prefix text not null,                   -- 'rb_live_' or 'rb_test_'
  last_4 text not null,
  secret_hash text not null,              -- bcrypt-equivalent (pgcrypto)
  name text,
  scopes text[] not null default '{read}', -- 'read' / 'write'
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index api_keys_owner_idx
  on public.api_keys (owner_id);
create index api_keys_active_idx
  on public.api_keys (revoked_at)
  where revoked_at is null;

alter table public.api_keys enable row level security;

create policy "owners select on api_keys"
  on public.api_keys for select using (owner_id = auth.uid());
create policy "owners insert on api_keys"
  on public.api_keys for insert with check (owner_id = auth.uid());
create policy "owners update on api_keys"
  on public.api_keys for update using (owner_id = auth.uid());
create policy "owners delete on api_keys"
  on public.api_keys for delete using (owner_id = auth.uid());

create trigger set_updated_at_api_keys
  before update on public.api_keys
  for each row execute function public.set_updated_at();

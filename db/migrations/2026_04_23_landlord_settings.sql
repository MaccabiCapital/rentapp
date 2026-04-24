-- ============================================================
-- Sprint 14 — Landlord settings (listings syndication feed)
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Per-landlord settings row. V1 holds the listings syndication
-- feed token — an unguessable URL suffix the landlord shares
-- with Zillow Rental Manager / aggregators that accept an XML
-- feed of listings. Rotating the token invalidates any old
-- feed URLs.

create table public.landlord_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  listings_feed_token text unique,
  listings_feed_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists landlord_settings_feed_token_idx
  on public.landlord_settings (listings_feed_token)
  where listings_feed_token is not null;

alter table public.landlord_settings enable row level security;

create policy "owner can select own settings"
  on public.landlord_settings for select to authenticated
  using (owner_id = auth.uid());
create policy "owner can insert own settings"
  on public.landlord_settings for insert to authenticated
  with check (owner_id = auth.uid());
create policy "owner can update own settings"
  on public.landlord_settings for update to authenticated
  using (owner_id = auth.uid());

create trigger set_updated_at before update on public.landlord_settings
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- Listing syndication: ILS feeds to Zillow, Apartments.com, etc.
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- A landlord enables syndication and we mint a per-landlord
-- token. They paste the resulting feed URL into Zillow Rental
-- Network, Apartments.com partner portal, Realtor.com, etc.
-- The aggregators crawl the feed daily; we record each crawl
-- so the landlord can see which portals are picking it up.
--
-- The feed itself is generated on demand from the active
-- listings table — no caching needed for v1.

create table public.syndication_feeds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  feed_token text not null unique,
  is_active boolean not null default true,

  -- Aggregate crawl tracking (any portal hit)
  last_crawled_at timestamptz,
  last_crawled_user_agent text,
  total_crawl_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

create index syndication_feeds_token_idx
  on public.syndication_feeds (feed_token)
  where is_active = true;
create index syndication_feeds_owner_idx
  on public.syndication_feeds (owner_id);

alter table public.syndication_feeds enable row level security;

create policy "owners select on syndication_feeds"
  on public.syndication_feeds for select using (owner_id = auth.uid());
create policy "owners insert on syndication_feeds"
  on public.syndication_feeds for insert with check (owner_id = auth.uid());
create policy "owners update on syndication_feeds"
  on public.syndication_feeds for update using (owner_id = auth.uid());
create policy "owners delete on syndication_feeds"
  on public.syndication_feeds for delete using (owner_id = auth.uid());

create trigger set_updated_at_syndication_feeds
  before update on public.syndication_feeds
  for each row execute function public.set_updated_at();

-- ============================================================
-- Per-portal status — how often each aggregator pulls our feed
-- ============================================================
-- Inferred from the User-Agent header on each crawl. We map
-- known UAs (Googlebot for Zillow's RSS Pull, AppCom-RentalCrawler,
-- etc) to portal names. Unknown UAs land in 'other'.

create table public.syndication_portal_status (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references public.syndication_feeds(id) on delete cascade,
  portal_name text not null,

  last_crawled_at timestamptz,
  total_crawl_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (feed_id, portal_name)
);

create index syndication_portal_status_feed_idx
  on public.syndication_portal_status (feed_id);

-- This table is read by the dashboard and written by the public
-- feed route via service-role (since the feed is unauthenticated
-- from aggregators' perspective). RLS still enabled to gate
-- session-client reads to the owning landlord.

alter table public.syndication_portal_status enable row level security;

-- The owner sees their own portal status via a join on syndication_feeds.
create policy "owners select on syndication_portal_status"
  on public.syndication_portal_status for select using (
    exists (
      select 1 from public.syndication_feeds f
      where f.id = feed_id and f.owner_id = auth.uid()
    )
  );

create trigger set_updated_at_syndication_portal_status
  before update on public.syndication_portal_status
  for each row execute function public.set_updated_at();

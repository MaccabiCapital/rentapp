-- ============================================================
-- retell_webhook_events — inbound webhook idempotency + audit (13b)
-- ============================================================
--
-- Every webhook delivery lands here first. The unique index on
-- (owner_id, event_type, external_id) gives us dedupe at insert
-- time: duplicate deliveries are swallowed via ON CONFLICT DO
-- NOTHING, and we only run side-effects on the first insert.
--
-- Also serves as the audit trail — if a maintenance request
-- looks wrong, we can replay the raw payload from this table.
--
-- Service role only. No authenticated read policy.

create table public.retell_webhook_events (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  -- chat_started | chat_ended | chat_analyzed
  event_type   text not null,
  -- Retell's chat_id — stable across retries for the same event
  external_id  text not null,
  payload      jsonb not null,
  received_at  timestamptz not null default now(),
  processed_at timestamptz,
  process_error text,
  unique (owner_id, event_type, external_id)
);

create index retell_webhook_events_unprocessed_idx
  on public.retell_webhook_events (received_at desc)
  where processed_at is null;

alter table public.retell_webhook_events enable row level security;
-- No policies → no authenticated access. Webhook route reads/writes
-- with the service role client (bypasses RLS).

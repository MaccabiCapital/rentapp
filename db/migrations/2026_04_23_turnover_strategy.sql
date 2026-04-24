-- ============================================================
-- Sprint 14 — Turnover strategy column on leases
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- When a tenant gives notice (or the landlord serves a
-- termination notice), the landlord chooses whether to start
-- the turnover phase immediately (list during the notice period
-- to minimize vacant days) or defer until move-out (if the unit
-- needs a full refresh before showings).
--
-- NULL = not yet decided.

alter table public.leases
  add column if not exists turnover_strategy text;

-- Loose check — keep the column flexible but validate values.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leases_turnover_strategy_check'
  ) then
    alter table public.leases
      add constraint leases_turnover_strategy_check
      check (
        turnover_strategy is null
        or turnover_strategy in ('list_during_notice', 'wait_until_vacant')
      );
  end if;
end $$;

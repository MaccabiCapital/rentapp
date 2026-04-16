-- ============================================================
-- Add 'assigned' status to maintenance_status enum
-- ============================================================
--
-- 'assigned' sits between 'open' and 'in_progress': the landlord
-- has committed a vendor (assigned_to populated) but the work
-- hasn't actually started yet. Lets the status flow read more
-- honestly than jumping straight from open → in_progress.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'maintenance_status' and e.enumlabel = 'assigned'
  ) then
    -- Place 'assigned' right after 'open' so ordering matches the
    -- real workflow for any enum-ordered queries.
    alter type public.maintenance_status add value 'assigned' after 'open';
  end if;
end$$;

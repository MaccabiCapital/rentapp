-- ============================================================
-- Sprint 14 — Move-out info packet notice type
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- When a tenant gives notice, the landlord typically hands
-- them a "move-out packet" covering:
--   - Landlord's right to show the unit during notice period
--   - Move-out day procedures (keys, condition, elevator/dock)
--   - Security deposit return process + forwarding address
--   - Utility transfer + renters insurance cancellation
--
-- This is distinct from a termination notice (which ends the
-- tenancy) and from an entry notice (which grants a specific
-- entry). It's an informational packet given once at the start
-- of the notice period.

alter type notice_type add value if not exists 'move_out_info';

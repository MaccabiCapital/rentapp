-- ============================================================
-- Michigan — real data for rent rules + fair housing rules
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Replaces the "not yet researched" placeholder for MI in
-- state_rent_rules (added during Sprint 13) and inserts a
-- researched row in state_fair_housing_rules (added during the
-- FairScreen Phase 2 migration today).
--
-- All facts cited inline. ATTORNEY-REVIEW-PENDING per FairScreen
-- founder-Q answer (engage attorneys post-Phase-7).

-- ------------------------------------------------------------
-- state_rent_rules — replace placeholder with verified data
-- ------------------------------------------------------------
-- Sources:
--   - MCL 554.602 — security deposit max 1.5x monthly rent
--   - MCL 554.609 — 30-day deposit return
--   - MCL 554.609a — tenant must provide forwarding address
--     within 4 days of moving out
--   - No statewide rent cap (state preempts local rent control
--     under PA 226 of 1988)
--   - No statewide late-fee cap; reasonable fees only

update public.state_rent_rules
set
  max_annual_increase_percent     = null,            -- no statewide cap
  max_annual_increase_formula     = null,
  has_statewide_cap               = false,
  increase_notice_days            = 30,              -- 30 days for monthly tenancy
  no_cause_termination_notice_days = 30,             -- 30 days monthly tenancy
  tenant_notice_days              = 30,              -- 30 days monthly tenancy
  security_deposit_max_months     = 1.5,             -- MCL 554.602
  security_deposit_return_days    = 30,              -- MCL 554.609
  late_fee_max_percent            = null,            -- no statewide cap; must be reasonable
  late_fee_grace_days_min         = null,            -- no statewide minimum
  eviction_cure_period_days       = 7,               -- 7-day demand for non-payment
  has_city_rent_control           = false,           -- preempted statewide
  city_rent_control_note          = 'Local rent control preempted by PA 226 of 1988.',
  source_url                      = 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-554-602',
  source_title                    = 'Michigan Compiled Laws — Chapter 554 (Security deposit / landlord-tenant)',
  effective_date                  = '1972-04-21',    -- MCL 554.602 enactment
  last_verified_on                = current_date,
  verified_by                     = 'Claude Code session 2026-04-26',
  is_researched                   = true,
  notes                           = 'Tenant must provide forwarding address within 4 days of move-out (MCL 554.609a). Failure to return deposit within 30 days = 2x deposit penalty (MCL 554.613). ATTORNEY-REVIEW-PENDING.'
where state = 'MI';

-- ------------------------------------------------------------
-- state_fair_housing_rules — insert MI with verified data
-- ------------------------------------------------------------
-- Sources:
--   - MCL 37.2102 — Elliott-Larsen Civil Rights Act
--   - PA 6 of 2023 — codified sexual orientation + gender identity
--     additions (effective 2024-03-31)
--   - Michigan Department of Civil Rights — housing guidance
--   - Fair Housing Center of Michigan — source-of-income overview
--
-- Notes:
--   * Elliott-Larsen protected classes are: religion, race, color,
--     national origin, age, sex, sexual_orientation, gender_identity,
--     height, weight, familial_status, marital_status. The
--     federal 7 are already in the US baseline; this row lists
--     ONLY the add-ons.
--   * height + weight are protected statewide (Michigan is one of
--     very few states) but our fh_protected_class enum doesn't
--     include them — captured in notes for v1; future enum
--     extension required to surface findings on those specifically.
--   * Source of income is NOT protected statewide. Local SOI
--     ordinances exist in Ann Arbor, East Lansing, Lansing,
--     and a few other cities — captured in soi_notes.
--   * No statewide ban-the-box for housing. Some cities have
--     fair-chance ordinances.
--   * No statewide application-fee cap.

insert into public.state_fair_housing_rules
  (jurisdiction, jurisdiction_name, protected_classes_added,
   protects_source_of_income, soi_notes,
   fair_chance_housing_law, fair_chance_notes,
   max_application_fee_cents, application_fee_notes,
   income_multiple_max, income_multiple_notes,
   source_url, source_title, effective_date, last_verified_on,
   verified_by, is_researched, notes)
values
  ('MI', 'Michigan',
   array['age', 'sexual_orientation', 'gender_identity',
         'marital_status']::fh_protected_class[],
   false,
   'Source of income NOT protected statewide. Local protections exist in Ann Arbor, East Lansing, Lansing, and a small number of other Michigan cities — verify per property location.',
   false,
   'No statewide ban-the-box for housing. Detroit, Ann Arbor, and some others have municipal fair-chance ordinances.',
   null,
   'No statewide application-fee cap. Charge only what is reasonable for screening.',
   null,
   'No statewide income-multiple cap.',
   'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-37-2102',
   'Elliott-Larsen Civil Rights Act (MCL 37.2102) as amended by PA 6 of 2023',
   '1976-03-31',  -- original Elliott-Larsen enactment
   current_date,
   'Claude Code session 2026-04-26',
   true,
   'Michigan additionally protects HEIGHT and WEIGHT (one of very few US states); these are not yet in the fh_protected_class enum. Sexual orientation + gender identity formally codified by PA 6 of 2023 (effective 2024-03-31); previously read into Elliott-Larsen by MI Supreme Court 2022. ATTORNEY-REVIEW-PENDING.')
on conflict (jurisdiction) do update set
  protected_classes_added = excluded.protected_classes_added,
  protects_source_of_income = excluded.protects_source_of_income,
  soi_notes = excluded.soi_notes,
  fair_chance_housing_law = excluded.fair_chance_housing_law,
  fair_chance_notes = excluded.fair_chance_notes,
  max_application_fee_cents = excluded.max_application_fee_cents,
  application_fee_notes = excluded.application_fee_notes,
  income_multiple_max = excluded.income_multiple_max,
  income_multiple_notes = excluded.income_multiple_notes,
  source_url = excluded.source_url,
  source_title = excluded.source_title,
  effective_date = excluded.effective_date,
  last_verified_on = excluded.last_verified_on,
  verified_by = excluded.verified_by,
  is_researched = excluded.is_researched,
  notes = excluded.notes;

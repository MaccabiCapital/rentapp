-- ============================================================
-- Sprint 9.A — State rent rules seed data (50 states)
-- ============================================================
-- Apply: paste into Supabase SQL editor and run AFTER the
-- state_rent_rules table migration has been applied.
--
-- 10 states are researched with real values from public sources.
-- 40 states are placeholders with is_researched=false — the
-- compliance dashboard shows them as "coming soon — verify with
-- your attorney" so the landlord never acts on unknown data.
--
-- DISCLAIMER: This data is for reference only and not legal
-- advice. Values were compiled from public state landlord-tenant
-- handbooks and may be out of date. Every row carries a
-- last_verified_on timestamp; the UI flags anything older than
-- 90 days. Always verify with a qualified attorney in your state.

-- ------------------------------------------------------------
-- The 10 researched states
-- ------------------------------------------------------------

insert into public.state_rent_rules (
  state, state_name, max_annual_increase_percent, max_annual_increase_formula,
  has_statewide_cap, increase_notice_days, no_cause_termination_notice_days,
  tenant_notice_days, security_deposit_max_months, security_deposit_return_days,
  late_fee_max_percent, late_fee_grace_days_min, eviction_cure_period_days,
  has_city_rent_control, city_rent_control_note, source_url, source_title,
  effective_date, last_verified_on, verified_by, is_researched, notes
) values
-- California: AB 1482
('CA', 'California', 10.00,
 'The lesser of 5% + local CPI or 10%, per year (AB 1482)',
 true, 30, 60, 30, 2.0, 21, null, null, 3,
 true, 'Local ordinances in LA, SF, Berkeley, Oakland, San Jose, Santa Monica and others may impose stricter caps. Check the local rent board.',
 'https://www.courts.ca.gov/selfhelp-eviction.htm',
 'California Courts Self-Help — Landlord/Tenant',
 '2020-01-01', '2026-04-15', 'Rentbase Research', true,
 'AB 1482 applies to most buildings 15+ years old. New construction (under 15 yrs), single-family homes owned by individuals (not corporations), and affordable housing are exempt. 60-day notice for no-cause if tenant occupied >1 year, otherwise 30-day.'),

-- New York: ETPA + HSTPA 2019
('NY', 'New York', null,
 'No statewide cap on free-market units. Rent-stabilized units governed by the NY Rent Guidelines Board annual vote. NYC has its own rules under HSTPA 2019.',
 false, 30, 30, 30, 1.0, 14, null, null, 14,
 true, 'NYC rent-stabilized units have extensive rules under HSTPA 2019. Cities including Buffalo, Rochester, Albany have local protections. Not applicable to owner-occupied 2-family homes.',
 'https://hcr.ny.gov/rent-laws',
 'NY Homes and Community Renewal — Rent Laws',
 '2019-06-14', '2026-04-15', 'Rentbase Research', true,
 'HSTPA 2019 tightened deposit (max 1 month), added 14-day late fee grace, and requires 30-60-90 day notice scaling with tenancy length for termination/increase >5%. Deposit must be returned within 14 days with itemized deductions.'),

-- Texas: no cap
('TX', 'Texas', null,
 'No statewide rent cap. Texas is an unrestricted rent state.',
 false, 30, 30, 30, null, 30, null, null, 3,
 false, 'Texas does not allow local rent control — state law preempts city ordinances.',
 'https://www.tdhca.state.tx.us/renters.htm',
 'Texas Department of Housing — Renters',
 '1995-01-01', '2026-04-15', 'Rentbase Research', true,
 'No statutory cap on security deposit but must be returned within 30 days. Written lease is binding; 30-day notice to terminate month-to-month. Tex. Prop. Code § 92.331 covers retaliation.'),

-- Florida: no cap
('FL', 'Florida', null,
 'No statewide rent cap. Local rent control is preempted by state law (F.S. 125.0103). Landlord may raise rent by any amount at lease renewal.',
 false, 15, 15, 15, null, 15, null, null, 3,
 false, 'State law preempts city rent control. No restriction on rent increase amount or frequency.',
 'https://www.myfloridalegal.com/consumer-protection/landlord-tenant-law',
 'Florida Attorney General — Landlord/Tenant Law',
 '1977-06-01', '2026-04-15', 'Rentbase Research', true,
 '15-day notice for month-to-month termination. No statutory cap on security deposit. Deposit must be returned within 15 days (or 30 with written claim) per F.S. 83.49.'),

-- Illinois: statewide preempted but Chicago has rules
('IL', 'Illinois', null,
 'No statewide rent cap. Cook County has the Residential Tenant and Landlord Ordinance; Chicago has the RLTO with its own rules.',
 false, 30, 30, 30, null, 30, null, null, 5,
 true, 'Chicago RLTO applies to most rental units and has specific deposit, late fee (max $10 for first $500 rent, 5% for excess), and eviction requirements. Cook County RTLO covers suburbs.',
 'https://www.illinois.gov/tenant-landlord',
 'Illinois Department of Human Rights — Tenant/Landlord',
 '2023-01-01', '2026-04-15', 'Rentbase Research', true,
 'Illinois statewide caps on late fees in Chicago: $10 per month on first $500 rent + 5% per month on excess over $500. Cook County RTLO effective June 2021. 5-day pay-or-quit notice is standard.'),

-- Pennsylvania: no cap
('PA', 'Pennsylvania', null,
 'No statewide rent cap. No local rent control is permitted under state law.',
 false, 0, 15, 15, 2.0, 30, null, null, 10,
 false, null,
 'https://www.attorneygeneral.gov/protect-yourself/consumer-advisories/renters-rights/',
 'Pennsylvania Attorney General — Renters Rights',
 '2002-01-01', '2026-04-15', 'Rentbase Research', true,
 'Deposit max 2 months rent first year, 1 month after. Deposit return within 30 days. No statutory notice for rent increase at renewal. 10-day pay-or-quit notice, 15-day termination notice for month-to-month.'),

-- Ohio: no cap
('OH', 'Ohio', null,
 'No statewide rent cap. Home-rule cities may pass their own ordinances but none currently impose rent control.',
 false, 30, 30, 30, null, 30, null, null, 3,
 false, null,
 'https://www.ohioattorneygeneral.gov/Individuals-and-Families/Consumers/Tenants',
 'Ohio Attorney General — Tenants Rights',
 '2009-01-01', '2026-04-15', 'Rentbase Research', true,
 'Deposits exceeding one month rent must earn 5% interest annually (Ohio Rev. Code § 5321.16). 30-day notice for termination and rent increase. Deposit return within 30 days with itemization.'),

-- Georgia: no cap
('GA', 'Georgia', null,
 'No statewide rent cap. Georgia Code § 44-7-19 preempts local rent control.',
 false, 60, 60, 30, null, 30, null, null, 0,
 false, null,
 'https://consumer.georgia.gov/consumer-topics/landlord-tenant-issues',
 'Georgia Consumer Protection — Landlord/Tenant',
 '1984-01-01', '2026-04-15', 'Rentbase Research', true,
 'Georgia requires 60-day notice from landlord and 30-day from tenant for month-to-month termination. No grace period for late rent. No statutory security deposit cap but return required within 30 days.'),

-- North Carolina: no cap
('NC', 'North Carolina', null,
 'No statewide rent cap. NC General Statutes § 42-14.1 and local preemption prevent rent control.',
 false, 0, 7, 7, 2.0, 30, null, 5, 10,
 false, null,
 'https://www.ncdoj.gov/protecting-consumers/housing/tenant-rights/',
 'NC Department of Justice — Tenant Rights',
 '2009-01-01', '2026-04-15', 'Rentbase Research', true,
 'Deposit max 2 weeks for weekly rent, 1.5 months for monthly, 2 months for longer. Return within 30 days. Late fee statutory max: greater of $15 or 5% of monthly rent, only after 5-day grace period (NC Gen Stat § 42-46).'),

-- Massachusetts: no statewide cap, city-level stabilization
('MA', 'Massachusetts', null,
 'No statewide rent cap. Cambridge, Somerville, Boston, and other cities are actively considering or have enacted local rent stabilization measures. Check your municipal rent board.',
 false, 30, 30, 30, 1.0, 30, null, 30, 14,
 true, 'Cambridge Rent Stabilization (Question 6, 2022). Somerville considering. Boston has home-rule authority but no active rent control as of 2026. Always check with the city rent board.',
 'https://www.mass.gov/info-details/landlord-tenant-law-in-massachusetts',
 'Mass.gov — Landlord/Tenant Law',
 '2023-01-01', '2026-04-15', 'Rentbase Research', true,
 'Security deposit max 1 month rent (M.G.L. c. 186 § 15B). Must be held in separate interest-bearing MA bank account. 30-day notice for rent increase on month-to-month. Late fee can only apply after 30-day grace period. 14-day notice for non-payment (Chapter 186).');

-- ------------------------------------------------------------
-- The 40 placeholder states
-- ------------------------------------------------------------
-- Everything below has is_researched=false. The compliance
-- dashboard shows them as "coming soon" until verified by a
-- future sprint or an attorney contractor.

insert into public.state_rent_rules (state, state_name, is_researched, notes)
values
  ('AK', 'Alaska', false, 'Not yet researched — verify with your attorney.'),
  ('AL', 'Alabama', false, 'Not yet researched — verify with your attorney.'),
  ('AR', 'Arkansas', false, 'Not yet researched — verify with your attorney.'),
  ('AZ', 'Arizona', false, 'Not yet researched — verify with your attorney.'),
  ('CO', 'Colorado', false, 'Not yet researched — verify with your attorney.'),
  ('CT', 'Connecticut', false, 'Not yet researched — verify with your attorney.'),
  ('DC', 'District of Columbia', false, 'Not yet researched — verify with your attorney.'),
  ('DE', 'Delaware', false, 'Not yet researched — verify with your attorney.'),
  ('HI', 'Hawaii', false, 'Not yet researched — verify with your attorney.'),
  ('IA', 'Iowa', false, 'Not yet researched — verify with your attorney.'),
  ('ID', 'Idaho', false, 'Not yet researched — verify with your attorney.'),
  ('IN', 'Indiana', false, 'Not yet researched — verify with your attorney.'),
  ('KS', 'Kansas', false, 'Not yet researched — verify with your attorney.'),
  ('KY', 'Kentucky', false, 'Not yet researched — verify with your attorney.'),
  ('LA', 'Louisiana', false, 'Not yet researched — verify with your attorney.'),
  ('MD', 'Maryland', false, 'Not yet researched — verify with your attorney.'),
  ('ME', 'Maine', false, 'Not yet researched — verify with your attorney.'),
  ('MI', 'Michigan', false, 'Not yet researched — verify with your attorney.'),
  ('MN', 'Minnesota', false, 'Not yet researched — verify with your attorney.'),
  ('MO', 'Missouri', false, 'Not yet researched — verify with your attorney.'),
  ('MS', 'Mississippi', false, 'Not yet researched — verify with your attorney.'),
  ('MT', 'Montana', false, 'Not yet researched — verify with your attorney.'),
  ('ND', 'North Dakota', false, 'Not yet researched — verify with your attorney.'),
  ('NE', 'Nebraska', false, 'Not yet researched — verify with your attorney.'),
  ('NH', 'New Hampshire', false, 'Not yet researched — verify with your attorney.'),
  ('NJ', 'New Jersey', false, 'Not yet researched — verify with your attorney. NJ has extensive rent control in many cities.'),
  ('NM', 'New Mexico', false, 'Not yet researched — verify with your attorney.'),
  ('NV', 'Nevada', false, 'Not yet researched — verify with your attorney.'),
  ('OK', 'Oklahoma', false, 'Not yet researched — verify with your attorney.'),
  ('OR', 'Oregon', false, 'Not yet researched — verify with your attorney. Oregon has a statewide rent cap under SB 608 — high priority for next refresh.'),
  ('RI', 'Rhode Island', false, 'Not yet researched — verify with your attorney.'),
  ('SC', 'South Carolina', false, 'Not yet researched — verify with your attorney.'),
  ('SD', 'South Dakota', false, 'Not yet researched — verify with your attorney.'),
  ('TN', 'Tennessee', false, 'Not yet researched — verify with your attorney.'),
  ('UT', 'Utah', false, 'Not yet researched — verify with your attorney.'),
  ('VA', 'Virginia', false, 'Not yet researched — verify with your attorney.'),
  ('VT', 'Vermont', false, 'Not yet researched — verify with your attorney.'),
  ('WA', 'Washington', false, 'Not yet researched — verify with your attorney. Washington HB 1217 effective 2025 introduced statewide cap.'),
  ('WI', 'Wisconsin', false, 'Not yet researched — verify with your attorney.'),
  ('WV', 'West Virginia', false, 'Not yet researched — verify with your attorney.'),
  ('WY', 'Wyoming', false, 'Not yet researched — verify with your attorney.');

-- Seed the initial changelog entries for the 10 researched states
insert into public.state_rent_rules_changelog (state_rule_id, changed_by, change_type, source_url, notes)
select id, 'rentbase-research', 'create', source_url,
  'Initial MVP seed — 10 states researched from public landlord-tenant handbooks. Not legal advice. Verify with attorney.'
from public.state_rent_rules
where is_researched = true;

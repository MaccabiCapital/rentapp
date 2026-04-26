# FairScreen — Builder Handoff

**Module:** `compliance` (extends the Sprint-0 stub at `app/dashboard/compliance/`)
**Spec:** `rentapp/docs/FAIRSCREEN-SPEC.md` (931 lines)
**Source idea:** Ideabrowser idea `#3776` — fair-housing compliance for small landlords
**Companion module:** `screening` (Proof Check) — must ship first; see prerequisite section below
**Founder:** Arthur (arthur.smelyansky@gmail.com) — not a developer; explain in product terms, offer to apply migrations via Supabase MCP yourself
**Repo:** `MaccabiCapital/rentapp` on `main`

---

## TL;DR — what this is

FairScreen is the **process-side** half of rentapp's lawsuit-shield positioning. Its sibling, **Proof Check** (`screening` module), forensically verifies whether *applicants* lied. FairScreen audits whether the *landlord* discriminated.

Five surfaces, one shared rule pack:

| Surface | What it does |
| --- | --- |
| Tenant Selection Criteria generator | Wizard → state-aware, FHA-compliant criteria PDF |
| Listing copy scanner | Flags discriminatory phrasing in ads, suggests rewrites |
| Application question audit | Every custom application question runs through the rule pack on save |
| Outbound message scanner persistence | Extends existing `scanOutboundMessage` to write durable findings |
| Disparate-impact monitor | Nightly cron over the screening audit log; flags landlord-side patterns without ever reading PII |

You are the **build agent**. The strategic spec is locked. The 6 founder questions in §8 of the spec are answered. Your job is to execute Phases 1–13 in `FAIRSCREEN-SPEC.md` §4.

---

## Read order — do this before opening a single file

1. **`CLAUDE.md`** (rentapp root) — hard rules, especially #1 (RLS) and #4 (fair-housing safe harbor). #4 is load-bearing for everything below.
2. **`docs/FAIRSCREEN-SPEC.md`** — full spec. §8 is answered, §9 has cross-references.
3. **`docs/PROOF-CHECK-SPEC.md`** — companion module spec. Same shape, same conventions, same fair-housing rules. If you're confused about a pattern, it's in here.
4. **`app/lib/leasing/fair-housing-guardrails.ts`** — the existing scanner. FairScreen's `listing-scanner.ts` and `question-validator.ts` extend the regex patterns from this file. Understanding this file is non-negotiable.
5. **`db/migrations/2026_04_15_state_rent_rules.sql`** — precedent for state-by-state reference data with `last_verified_on` staleness tracking. Your `state_fair_housing_rules` table follows this exact pattern.
6. **`docs/HANDOFF-2026-04-24.md`** — the Sprint 13/14 handoff. Tech-stack baseline. The 97-file uncommitted blob it describes is now committed (verify with `git status` on day 0; if not, stop and ask Arthur).

---

## Day-0 prerequisite check

**Run these first. Do not start Phase 2 until all four pass.**

```bash
cd "c:/Users/asmel/Desktop/coding with Claude/rentapp"

# 1. Repo is clean
git status                                       # → "nothing to commit, working tree clean"

# 2. Proof Check is shipped
ls db/migrations/2026_04_26_screening.sql        # → file exists
grep -r "screening_audit_log" app/lib/queries/   # → references found

# 3. Build is green
npm run lint && npx tsc --noEmit && npm test     # → all pass

# 4. Supabase has the screening tables
# (Run via Supabase MCP — do NOT hand SQL to Arthur):
#   select table_name from information_schema.tables
#   where table_schema = 'public'
#     and table_name in ('screening_reports', 'screening_signals', 'screening_audit_log');
# Expect 3 rows.
```

If **any** check fails:
- Repo not clean → ask Arthur whether to commit, stash, or abandon. Do not auto-commit.
- Proof Check missing → STOP. FairScreen depends on it for disparate-impact analysis. Ship Proof Check first per `docs/PROOF-CHECK-SPEC.md`.
- Build red → use the **build-error-resolver** agent. Do not start new work on a red build.
- Supabase missing tables → apply the Proof Check migration via Supabase MCP first.

---

## Phase 1 entry point

Phase 1 in the spec is "prerequisite — Proof Check shipped." If the day-0 checks pass, **Phase 1 is done.** Skip to Phase 2:

```bash
# Phase 2 begins here:
# 1. Create db/migrations/2026_05_XX_compliance.sql
#    (copy SQL block verbatim from FAIRSCREEN-SPEC.md §1)
# 2. Apply via Supabase MCP — do not paste SQL into chat for Arthur to run
# 3. Verify all 6 tables exist + RLS enabled
# 4. Create the compliance-documents bucket
# 5. Commit: feat(compliance): db migration + storage bucket
```

The XX in the filename is the month-day at the time you apply it. Use the actual date.

---

## Critical gotchas — already learned, do not relearn

These come from prior sprints. Re-discovering any of them costs hours.

### Schema field names (from `project_rentapp_state_2026_04_24.md`)
- `units` table uses **`unit_number`**, NOT `label`
- `listings` table uses **`headline_rent`**, NOT `monthly_rent`
- Earlier queries got these wrong and silently rendered "Unit" placeholders

### Next.js 16 — your training data is wrong
- `middleware.ts` is **`proxy.ts`**, same semantics, new file name
- `cookies()`, `headers()`, `params`, `searchParams` are **async** — `await` them
- Forms use `useActionState` + server actions + Zod (not deprecated `useFormState`)
- **Read `node_modules/next/dist/docs/` before writing any Next-specific code.** Specifically:
  - `01-app/01-getting-started/16-proxy.md`
  - `01-app/01-getting-started/07-mutating-data.md`

### RLS is load-bearing (CLAUDE.md hard rule #1)
- Every new table in this spec has `owner_id` + 4 RLS policies. Do not skip them.
- Service-role key is for migrations + cron only. Never read from a client-reachable path.
- The `disparate-impact` cron (`/api/cron/disparate-impact`) IS allowed to use the service-role key (it iterates landlords). Authenticate with `CRON_SECRET` header.

### Fair-housing hard rules (CLAUDE.md #4 + spec §"Hard rules")
- Findings are **advisory only**. The "Save anyway" button must always work, even with red findings.
- AI never raises findings — only summarizes / suggests rewrites. The rule pack is deterministic.
- Disparate-impact engine **never queries** name, email, phone, address, or any PII. Bias-neutrality is checked in the Phase 11 acceptance criteria with a manual SQL inspection. Do not skip that test.

### Founder communication (from `feedback_plain_english_always.md`)
- **Arthur is not a developer.** Do not paste SQL or TypeScript for him to run.
- Apply migrations via Supabase MCP yourself. Apply storage RLS via the Supabase dashboard yourself (or guide him with screenshots, not SQL).
- Explain features in product terms. "FairScreen flagged the word 'family-friendly' in your listing because it implies a familial-status preference" — not "the regex `/\bfamily[-\s]?friendly\b/i` triggered."
- Offer to do technical steps yourself rather than handing him a checklist.

### Rentapp brand voice (from `feedback_rmw_brand_voice.md`)
- This is the wrong project for that memory (RMW ≠ rentapp), but the principle still applies: no jargon-heavy headers in user-facing copy. Criteria PDF should read like a tenant can understand it.

---

## Stub activation cheatsheet

Every external dependency ships stubbed. v1 runs end-to-end with no external accounts. Activations:

| Stub | What activates it | Spec ref |
| --- | --- | --- |
| State coverage beyond 5 states | New rule-pack `.ts` file under `app/lib/compliance/rules/` + new seed row | §6.1 |
| City-level rules (NYC, SF, Seattle, Chicago) | Schema extension + new `city_fair_housing_rules` table | §6.2 |
| Attorney-reviewed PDF footer | One-time engagement after Phase 7 ships | §6.3 + §8.6 |
| Multi-language (Spanish) scanning | Spanish regex variants in rule pack files | §6.4 |
| Listing image scanning | Anthropic Claude vision integration | §6.5 |
| Cross-landlord pattern detection | Separate platform-level analytics pipeline | §6.6 |
| HUD complaint-record integration | Public-records vendor partnership | §6.7 |

None of these block Phase 13 completion. Document each one in `docs/SPRINT-FAIRSCREEN-NEEDS.md` (Phase 13 deliverable).

---

## Demo script — what "working v1" looks like

Once Phase 13 is done, this end-to-end flow must work without any external API keys:

1. **Sign in** as a landlord with at least one published listing.
2. **Navigate** to Compliance → Tenant selection criteria → Create new.
3. **Fill the wizard**: Name = "Default — Atlanta portfolio", Jurisdiction = `CA` (deliberate mismatch — let's see SOI protection in action).
4. Set income multiple = 3.0, accepts vouchers = **false**.
5. **On save:** the engine should flip `accepts_section_8` to **true** (CA SOI protection) and create a finding with rule_id `'ca.soi_required'`.
6. **Continue** to the criminal-history step. Set lookback = 10 years.
7. **On save:** an **amber** finding referencing AB 1418 should appear inline.
8. **Publish** the criteria. The PDF downloads cleanly with the fair-housing footer.
9. **Navigate** to Compliance → Listing scans → Saved listing → pick the published listing.
10. **(Pre-test setup):** edit that listing's description to include the phrase "perfect for young professionals". Save the listing.
11. **Re-scan.** A **red** finding appears: "Stating a preference for a demographic implies discrimination" + suggested rewrite.
12. **Click "Apply suggestion".** Listing copy updates. Re-scan returns 0 findings.
13. **Navigate** to a listing's application editor. Add a custom question: "How many kids do you have?".
14. **On save:** red finding appears implicating familial status with suggested rewrite "How many people will live in the unit?".
15. **Click "Save anyway".** Save succeeds. Audit log records both `question_validated` (red) and `question_saved_with_open_finding`.
16. **Navigate** to Compliance → Disparate impact → Run now.
17. The cron route runs synchronously (or via the manual-trigger button); a `disparate_impact_runs` row appears with `status='complete'`.
18. **Open** Compliance → Findings inbox. All findings from steps 5, 7, 11 (initial), and 14 are listed, filterable by source.
19. **Dismiss** one finding with reason "Reviewed with attorney 2026-XX-XX". It moves to the dismissed view; the audit log records the dismissal with the reason.
20. **Open** Compliance → Audit log. Every action above appears in chronological order. CSV export works.

If all 20 steps pass without an error and without any external API key, FairScreen v1 is shippable to internal use. Public marketing is still gated on attorney sign-off (per §8.6).

---

## Build cadence — recommended

Do not try to land the whole spec in one PR. Break by phase:

- **PR 1:** Phases 2–4 (db, seed, schemas + queries) — pure infrastructure, no UI risk
- **PR 2:** Phases 5–6 (rule packs + criteria generator engine + PDF) — testable in isolation
- **PR 3:** Phase 7 (criteria wizard UI) — first user-visible release, internal-test-ready
- **PR 4:** Phases 8–9 (listing scanner + question validator) — extends listings + application editor
- **PR 5:** Phase 10 (message scanner persistence) — touches the leasing assistant; verify backward compatibility
- **PR 6:** Phase 11 (disparate impact + cron)
- **PR 7:** Phases 12–13 (findings inbox, audit page, overview hub, docs)

Each PR runs `npm run lint && npx tsc --noEmit && npm test` clean. Each PR description references this handoff doc and the relevant spec phase numbers.

Use the **code-reviewer** agent on every PR before requesting Arthur's review. Use **security-reviewer** on PRs 1, 5, and 6 specifically (RLS, message scanning, cron auth — the three security-sensitive surfaces).

---

## What success looks like for the founder

When you hand the final PR back to Arthur, the artifacts he should see:

1. A **published criteria PDF** for the Maccabi portfolio (he can pick the jurisdiction).
2. **Zero red findings** on the active Maccabi listings (you scan them as part of the demo and apply rewrites).
3. **A first disparate-impact run** with synthetic-or-real data, showing the engine works without flagging the Maccabi portfolio incorrectly.
4. **A demo recording** (Loom or similar) walking the 20-step demo script above, ≤ 5 minutes.
5. **`SPRINT-FAIRSCREEN-NEEDS.md`** listing every stub and what activates each — Arthur uses this to decide which integrations to fund.

The deliverable is not "the code shipped." It's "Arthur can sit down with a fair-housing attorney for a single 1-hour review session and walk away with everything they need to bless the module for public marketing." Build toward that conversation.

---

## Pointers — when in doubt

| If you need... | Look at... |
| --- | --- |
| RLS pattern for a new table | `db/migrations/2026_04_22_inspections.sql` |
| Schema + Zod conventions | `app/lib/schemas/inspection.ts` |
| Server-action shape | `app/actions/screening.ts` (when it exists) or `app/actions/inspections.ts` |
| Audit page UI | `app/dashboard/leasing-assistant/audit/page.tsx` |
| Storage helper pattern | `app/lib/storage/photos.ts` |
| Sprint-needs format | `docs/SPRINT-13-NEEDS.md` |
| Fair-housing scanner regex style | `app/lib/leasing/fair-housing-guardrails.ts::INPUT_RULES` and `OUTPUT_RULES` |
| Cron route auth pattern | the late-fee cron from Sprint 14 (find via `grep -r CRON_SECRET app/api/`) |
| Compliance disclaimer banner | `app/ui/compliance-disclaimer.tsx` |
| State-rules staleness pattern | `db/migrations/2026_04_15_state_rent_rules.sql` (90/180-day amber/red) |

---

## Final reminder — the load-bearing line

This module exists because **fair-housing lawsuits are getting bankruptcy-grade and small landlords have no defense.** Every shortcut that weakens the safe harbor is a shortcut that puts a real landlord in real legal jeopardy. If a request would lower the bar — auto-rejection, AI-as-decision, hidden criteria, undocumented rules — escalate to Arthur before building. Don't ship the shortcut and apologize later.

Good luck. Ship clean.

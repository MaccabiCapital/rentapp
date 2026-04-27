# Rentbase — cohort retention & churn model

_Internal. Used to stress-test LTV assumptions in PRICING-ECONOMICS.md
and to drive the investor math in INVESTOR-MATH.md._

> **TL;DR:** Property management software has structurally low churn
> compared to most SMB SaaS because the cost of switching is real
> (lease data migration, tenant re-onboarding, payment rail switch).
> Conservative model: 24% gross annual churn (~2% monthly), implying
> 50-month average tenure. Premium pricing model: 18% gross annual
> churn, 67-month tenure. Both are net of voluntary downsizing.

---

## Why churn matters more than acquisition

A SaaS business is only valuable if customers stay. In the SMB rental
PM segment specifically:

- **Switching cost is high.** Migrating lease data, signature audit
  trails, rent collection rails, and tenant relationships is a
  full-week project. Landlords don't switch lightly.
- **Single-buyer decision.** No buying committee, no procurement
  review, no annual contract resets. Once they're in, they're in.
- **Sticky data + workflows.** Renewal alerts, audit logs, and
  state-compliance rule packs accrete value over time. Year 2 is
  more valuable than year 1; year 3 more than year 2.

Cohort modeling lets us quantify this rather than wave at it.

---

## Churn drivers (segmented)

### Voluntary churn

| Reason | Estimated annual rate | Mitigations |
|---|---|---|
| Sold all properties | 4% | None — they're out of the segment |
| Hired a property manager | 3% | Beat them on pricing for 20+ doors so they don't outgrow us |
| Downsized to 1 unit only (off Solo upward path) | 2% | Solo tier retains them |
| Moved to spreadsheet (cost concerns) | 3% | Free tier as off-ramp; survey on cancel |
| Moved to competitor (Buildium-class) | 2% | Capability parity; price advantage holds |
| Moved to competitor (RentRedi-class) | 2% | Migration friction works in our favor; AI features differentiate |

**Voluntary annual: ~16%**

### Involuntary churn

| Reason | Estimated annual rate | Mitigations |
|---|---|---|
| Card declined / payment failure (recovered) | 6% gross, 1% net | Smart dunning, ACH push, retry on day 3/7/14 |
| Card declined / payment failure (lost) | 1% net | Above |
| Bankruptcy / portfolio liquidation | 1% | None |
| Disputes / refund requests | 1% | Quality of product reduces |
| Account dormancy (90 days no login) | n/a | Not auto-cancelled; revenue continues |

**Involuntary annual: ~3%**

### Total assumed gross churn

| Tier | Monthly churn | Annual churn | Avg tenure |
|---|---|---|---|
| Conservative (worst-case) | 2.0% | 24% | 50 months |
| Base case | 1.5% | 18% | 67 months |
| Optimistic (high LTV) | 1.0% | 12% | 100 months |

Industry benchmarks for SMB B2B SaaS in adjacent segments:
- AppFolio (PM software, large): 5–8% annual gross churn
- Buildium: 10–12% annual gross
- RentRedi (small landlord): 25–30% annual gross
- Spreadsheet-replacement SaaS broadly: 25–40% annual

We're better than RentRedi (more sticky features) and worse than AppFolio
(smaller customers churn more). 18% base case is grounded.

---

## Cohort tables

### Retention curve (base case, 18% annual gross churn)

| Month | Retained % | Cum. revenue per landlord (at $80 ARPU) |
|---|---|---|
| 0 | 100% | $0 |
| 6 | 91% | $475 |
| 12 | 82% | $920 |
| 18 | 74% | $1,335 |
| 24 | 67% | $1,720 |
| 36 | 55% | $2,395 |
| 48 | 45% | $2,950 |
| 60 | 37% | $3,400 |
| 84 | 25% | $4,070 |

Note: this is a smoothed retention curve assuming proportional monthly
churn. Real cohorts have a "honeymoon" pattern (higher churn in first
6–12 months, then stabilization). Adjust upward in years 2+ if the
operational reality matches.

### LTV by tier and churn assumption

Each row is gross LTV (revenue × gross margin):

| Tier | Avg ARPU | 24% churn (LTV) | 18% churn (LTV) | 12% churn (LTV) |
|---|---|---|---|---|
| Solo (1–2 units) | $25 | $937 | $1,250 | $1,875 |
| **Small (3–10 units)** | $70 | $2,625 | $3,500 | $5,250 |
| **Mid (11–20 units)** | $95 | $3,562 | $4,750 | $7,125 |
| Large (21+ units) | $140 | $5,250 | $7,000 | $10,500 |

Gross margin assumed 75% throughout. Higher tiers tend to have slightly
higher COGS (more unit-volume = more LLM calls + Twilio + Resend
volume) but also significantly higher pricing power → margin holds.

---

## Net revenue retention (NRR)

NRR is gross retention plus expansion (upsells, add-ons, tier upgrades)
minus contraction (downgrades). Healthy SaaS NRR: 110–130%.

### Expansion levers we have

| Expansion path | Monthly $ uplift per affected landlord | % of base hit per year |
|---|---|---|
| Tier upgrade (Solo → Small from buying a 2nd unit) | +$25 | 8% |
| Tier upgrade (Small → Mid at 11 units) | +$25 | 6% |
| Twilio voice line add-on | +$25 | 12% |
| Custom branding add-on | +$20 | 8% |
| Premium screening report (per applicant) | +$40 | 30% (≈4 reports/year) |
| Annual compliance review | +$17/mo equiv | 5% |

**Estimated NRR:**
- Gross retention: 82% (base)
- Expansion revenue: ~22% per cohort per year
- **NRR: ~104%**

That's solid for SMB. AppFolio quotes ~108% NRR; Buildium doesn't
disclose. We can plausibly hit 110%+ once we have year-3 data and tune
the expansion engine.

---

## Cohort revenue projection (base case)

Assumes:
- Acquire 100 landlords/month starting month 1
- 6-month organic ramp to that rate (10 → 30 → 60 → 80 → 90 → 100)
- $80 average ARPU
- 18% annual gross churn (1.5% monthly)
- 4% annual expansion (NRR ~104%)

| Month | New | Active | Total MRR | ARR run-rate |
|---|---|---|---|---|
| 6 | 60 | 351 | $28k | $336k |
| 12 | 100 | 1,029 | $82k | $984k |
| 18 | 100 | 1,659 | $133k | $1.6M |
| 24 | 100 | 2,232 | $179k | $2.1M |
| 36 | 100 | 3,180 | $254k | $3.0M |
| 48 | 100 | 3,818 | $305k | $3.7M |
| 60 | 100 | 4,247 | $340k | $4.1M |

Steady-state cap (where new ≈ churn) at ~5,400 active landlords for the
"100/month new + 1.5%/month churn" inputs. To grow past that, either:
- Accelerate acquisition past 100/mo (new channels, paid ads ROI proven)
- Reduce churn (operational improvements, better onboarding)
- Increase ARPU (higher-tier mix, stronger expansion)

---

## Sensitivity analysis

What happens to ARR at month 36 if we miss assumptions?

| Variable | -20% | base | +20% |
|---|---|---|---|
| Acquisition rate (80/100/120 per month) | $2.4M | $3.0M | $3.6M |
| ARPU ($64/$80/$96) | $2.4M | $3.0M | $3.6M |
| Annual churn (22%/18%/14%) | $2.6M | $3.0M | $3.4M |

Acquisition rate and ARPU are the levers with the highest impact.
**Underpricing kills the business twice — once on direct revenue, once
on what each customer is "worth" when growth-modeling.** This is the
specific reason the $29/mo anchor in the original draft was wrong.

---

## What we measure to validate

Per cohort, monthly:

1. **Gross monthly churn rate** (must trend toward 1.5% by month 6)
2. **Net new MRR** (acquisition × ARPU − churn × ARPU + expansion)
3. **NRR** (rolling 12-month, target >100% by month 18)
4. **Logo retention by month** (target >75% at month 12)
5. **Avg ARPU at month 0 vs month 12** (expansion working if rising)
6. **Card-decline rate** (target <2% / month, dunning recovers >70%)
7. **Free → paid conversion** (target 8–12% within 30 days)

Build a simple cohort dashboard inside Rentbase's `/dashboard/reports`
once we have ~50 paying customers; before that, a Google Sheet is
fine. Don't over-engineer the analytics stack early.

---

## Risk to retention

The two big "what if's":

1. **Tenant tooling parity from competitors.** If RentRedi/Avail bolt
   on AI screening for free in 12 months, our differentiation narrows.
   Mitigation: deepen the moat — compliance rule packs that scale by
   state (hard for them to replicate), audit trail formats that pass
   state inspector tests (hard to retrofit).
2. **Anti-fair-housing AI sentiment.** If a Rentbase-built listing
   description gets flagged in a public lawsuit despite our scanners,
   the AI angle becomes a liability. Mitigation: keep the human in the
   loop visibly (every AI output has the &ldquo;recommendation, not
   decision&rdquo; chip); maintain attorney retainer; have an incident
   playbook for if/when a customer is sued.

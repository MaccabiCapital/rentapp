# Rentbase — investor math

_What a seed/Series A investor wants to see before writing a check._

> **TL;DR:** $48B+ TAM (US small landlord rental software). Bottoms-up
> achievable target: 0.5% share = $48M ARR by year 5, achievable on a
> $4M raise. LTV:CAC = 7:1 in base case. Gross margin 75%+. Path to
> profitability at ~2,500 paying landlords. Defensibility comes from
> compliance rule packs + audit-trail formats that compound with each
> state we cover.

---

## Market size

### Top-down

- **US rental units:** ~44.1 million (2024 ACS data)
- **Owned by individual investors / small landlords:** ~70%
  (~30.9M units)
- **Held by landlords with 3+ units:** ~50% of those (~15M units)
- **Average portfolio size in our segment:** 6 units
- **Implied target landlords:** ~2.5M households

### TAM/SAM/SOM

| Layer | $ | Reasoning |
|---|---|---|
| **TAM** (US small landlord PM software) | $4.5B/yr | 2.5M landlords × $150/mo ARPU avg |
| **SAM** (3–20 unit owner-operators willing to pay for software) | $2.4B/yr | ~50% addressable in next 5 yrs |
| **SOM** (realistic 5-year capture) | $48M ARR | 2% of SAM, achievable single-state-by-state expansion |

For comparison:
- AppFolio public revenue: ~$700M/yr (mostly large PM)
- Buildium (Real Page subsidiary): ~$200M/yr est
- RentRedi: ~$15M/yr est (Series B 2023)
- Avail: ~$20M/yr est (acquired by Realtor.com 2020)

**The 3–20 unit owner-operator segment is large, fragmented, and
poorly served.** Buildium/AppFolio price themselves out; RentRedi/Avail
under-feature.

---

## Bottoms-up revenue projection

Conservative scenario, single-channel acquisition (organic + paid
search, no enterprise sales).

| Year | Active landlords (EOY) | ARPU | ARR | Growth |
|---|---|---|---|---|
| 1 | 1,000 | $80 | $1.0M | — |
| 2 | 3,200 | $85 | $3.3M | 230% |
| 3 | 7,500 | $90 | $8.1M | 145% |
| 4 | 14,000 | $95 | $16.0M | 97% |
| 5 | 25,000 | $100 | $30.0M | 88% |

Driver assumptions:
- Acquisition ramps from 100/mo (Y1) to 1,500/mo (Y5)
- ARPU rises gradually as portfolio mix shifts to Mid/Large + add-ons
- Churn settles to 1.5% monthly by Y2 (industry norm for sticky SMB)

---

## Unit economics (steady state, year 3+)

| Metric | Value |
|---|---|
| Avg ARPU | $90/mo |
| Gross margin | 78% |
| Avg customer tenure | 67 months (18% annual gross churn) |
| Gross LTV | $4,700 |
| Net LTV (with NRR ~110%) | $5,640 |
| CAC (blended) | $250 |
| LTV : CAC | 22.6 : 1 |
| Payback period | 3.6 months |
| Contribution margin per customer | $70/mo |

These are healthy SaaS metrics by any standard:
- LTV:CAC > 3 → fundable
- Payback < 12 months → fundable
- Gross margin > 70% → SaaS-quality margins
- Tenure > 36 months → sticky

---

## Funding ask

### Seed: $1.5M

| Use | $ | What it funds |
|---|---|---|
| Engineering (2 hires) | $600k | Build out: screening integrations (Checkr, Persona, Plaid Income), tenant mobile, more state rule packs |
| Compliance attorney retainer | $80k | State-by-state legal reviews; preempt fair-housing risks |
| Customer success (1 hire) | $120k | Onboarding + retention; reduces churn from 24% → 18% |
| Paid acquisition test budget | $300k | Validate Google + Facebook + Reddit channels, identify scalable winners |
| Founder / runway | $400k | 18 months at $20k/mo opex headroom |

**Targets at end of seed (18 months):** 1,200 paying landlords, $1.2M ARR,
4-month payback proven, 18% annual churn confirmed across 3 cohorts.

### Series A: $6–8M

Triggered by hitting:
- $1M+ ARR
- LTV:CAC > 3 (proven in spreadsheet, not theoretical)
- Net retention > 100%
- 2+ paid acquisition channels with positive ROI

Use of funds: scale acquisition (paid + content), expand to all 50
states (rule packs), build out enterprise tier for 21+ unit landlords
who don't want to leave us, hire VP Product + VP Marketing.

**Series A targets at end (24 months):** 8,000 paying landlords, $8M
ARR, 110% NRR, gross margin >75%.

---

## Defensibility (the moat)

This is what investors will press hardest on. The honest answer:

### Strong moats (compounding)

1. **Compliance rule packs by state.** Each state requires ~$2k of
   attorney review + ongoing maintenance. After 12 months we have
   meaningful coverage; after 24 months we cover the top 30. A
   competitor catching up needs 6–12 months minimum and significant
   legal cost. **This is a real moat that grows with time.**

2. **Audit trail formats.** Our signature audit log format is
   designed to satisfy state inspector subpoenas (timestamp, IP,
   user-agent, typed name, drawn signature image). We can publish
   this as a standard and become the format other tools have to
   match — like how DocuSign became the e-sign standard.

3. **Customer-side data lock-in.** Lease history, audit logs,
   payment history, screening reports. After 18 months, the cost
   of leaving is ~$50–200 in re-keying labor + risk of losing
   compliance documentation. Sticky.

### Medium moats

4. **AI tuning for the domain.** Our system prompts catch
   protected-class language better than a stock LLM because we've
   tuned them on real listings. Replicable in 6 months by a competitor
   with engineering resources. Not a long-term moat.

5. **Brand trust.** "The fair-housing-safe one." If we get the
   marketing right, this becomes the thing landlords think of when
   they see a fair-housing news story. Marketing-driven moat, slow
   to build, slow to lose.

### Weak / non-moats

6. **Feature breadth.** Buildium/AppFolio could replicate any single
   feature. Our advantage is integration + the targeted ICP.
7. **AI features.** GPT-class models will commoditize this in 2 years.
   Our position has to be "we use AI well, fair-housing-safely" not
   "we have AI." Distinguish on application, not on technology.

---

## Comparables / exit math

### Public comparables

| Company | Revenue | Multiple | Implied valuation at $30M ARR |
|---|---|---|---|
| AppFolio (NASDAQ: APPF) | $700M | 8.5× ARR | $255M |
| ServiceTitan (NYSE: TTAN) | $670M | 11× ARR | $330M |
| Procore (NYSE: PCOR) | $1.0B | 9× ARR | $270M |

### Recent private exits (rental tech)

- **Avail** — acquired by Realtor.com (2020): est $50M for ~$15M ARR
- **TenantCloud** — series B 2022 at ~$120M valuation, ~$10M ARR
- **Innago** — bootstrapped, no public exit data
- **Hemlane** — series A 2021, $30M valuation

### Realistic exit valuations

| Year | ARR | Multiple range | Valuation range |
|---|---|---|---|
| 3 | $8M | 5–8× | $40M – $64M |
| 5 | $30M | 6–9× | $180M – $270M |
| 7 | $80M+ | 6–10× | $480M – $800M |

---

## Why now

1. **Fair housing complaints are rising.** HUD reported 32k+ filed
   complaints in 2023, up 14% YoY. AI-generated listings amplify the
   risk. Landlords are scared and want a tool that handles this.
2. **Anthropic / OpenAI APIs are now cheap enough.** $0.001 paystub
   OCR was unthinkable 2 years ago. The economics work.
3. **Stripe + plaid maturity.** ACH rent collection is finally
   reliable enough that landlords trust it. 5 years ago, paper
   checks dominated.
4. **Buildium price increases (2023, 2024).** Their floor went from
   $52 to $58 to $79 in two years. Customers complain publicly. Open
   door for a cheaper alternative for the small-portfolio segment.
5. **AppFolio vacating the SMB market.** Their 2024 strategy is
   clearly enterprise-up. Below 50 doors is no longer their fit.
   That's our segment, and they're walking away from it.

---

## Risks (and how we mitigate)

| Risk | Probability | Mitigation |
|---|---|---|
| AI commoditization erodes differentiation | High in 18 mo | Build moat in compliance rule packs (which AI can't replicate without legal review) |
| Buildium/AppFolio launches a "small landlord" line | Medium | Already have 12-month head start; focus on AI + fair-housing positioning they can't pivot to fast |
| Fair-housing lawsuit caused by our AI output | Low–medium | 3-layer guardrails + audit logs + attorney retainer; have an incident playbook |
| Stripe/Plaid policy change kills rent collection economics | Low | Pass-through pricing, no markup; we don't depend on payment-rail margin |
| Founder burnout / single point of failure | Medium | Bring in co-founder or first engineering hire by month 6 |
| Regulatory change (state law shifts) | Low–medium | Attorney retainer covers ongoing rule-pack updates; the work itself is our moat |

---

## Pitch structure (for fundraising)

When the deck gets built, the slides should hit in this order:

1. **The pain** — landlords get sued for $50k+ for fair-housing
   violations they didn't intend. AI-generated listings amplify it.
2. **The market** — 2.5M US landlords with 3–20 units, $4.5B annual
   spend, dominated by tools that aren't built for them.
3. **The wedge** — fair-housing-safe AI as the entry point. Cheaper
   than a lawyer, smarter than spreadsheets.
4. **The product** — operating system, not a feature. (Walk through
   the lifecycle: list → screen → sign → collect → renew.)
5. **The differentiation** — compliance rule packs (slide showing 6
   states covered today, roadmap to 50). Show one rule pack file.
6. **Traction** — paying landlords, MRR, churn, NRR. Be specific.
7. **The economics** — LTV $4,700, CAC $250, 4-month payback, 78%
   gross margin.
8. **The plan** — what $1.5M / $8M unlocks.
9. **Why us** — founder relevance + advisory bench (legal +
   real estate operator).
10. **The ask** — round size, valuation, intended use.

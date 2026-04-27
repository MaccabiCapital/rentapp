# Rentbase — pricing & unit economics

_Internal strategy, not customer-facing. The customer-facing pitch lives
in MARKETING-PITCH.md, but this doc supersedes the placeholder pricing
in there._

> **TL;DR:** $29/mo flat was an anchor on the spreadsheet-replacement
> end of the market. Wrong frame. The right frame is *fraction of value
> captured* — and a 10-unit landlord with Rentbase gets ~$300/mo of
> quantifiable value (late fees enforced, screening time saved, fair-
> housing risk reduced). Charge $7/door/mo with a $50/mo floor and add
> monetization on top. That's $50–140/mo flat plus per-event fees.

---

## What it actually costs us to serve a landlord

Variable cost per active landlord per month, assuming 5–15 units, normal usage:

| Line item | Monthly cost |
|---|---|
| Anthropic LLM (screening summaries, listing copy, leasing drafts, paystub OCR) | $1.00 |
| Supabase (DB + storage + auth) | $0.20 |
| Vercel (Next.js hosting + edge) | $0.10 |
| Resend email | $0.05 |
| Twilio Lookup (employer phone verify, ~5/mo) | $0.05 |
| Stripe (passthrough, but card fees on rent: 2.9% + $0.30) | passthrough |
| **Variable COGS** | **~$1.40/mo** |

Plus amortized fixed costs:

| Line item | Per-landlord cost (at 500 active) |
|---|---|
| Customer support (1 FTE / 500 landlords / month) | $13.00 |
| Founder time on roadmap + bugs | $10.00 |
| Attorney retainer (state rule packs, terms updates) | $4.00 |
| **Fixed-amortized cost** | **~$27/mo** |

**Total cost to serve at scale: ~$28/mo per landlord.**
**Variable-only cost (true marginal): ~$1.40/mo.**

The fixed costs go to zero as you scale. At 5,000 landlords, fixed-amortized
drops to ~$3/mo and total cost-to-serve approaches $4–5/mo.

---

## What competitors charge (and what they actually offer)

| Product | Pricing (3–20 units) | What's included | What's missing vs us |
|---|---|---|---|
| **Spreadsheets + email** | $0 | nothing | everything |
| **TurboTenant** | $9/mo flat + à la carte | listings, basic screening | no AI, no e-sign, manual rent |
| **RentRedi** | $19.95–24.95/mo flat | rent collection, basic mgmt | no AI, no fair-housing scanner |
| **Avail** | Free for landlords; tenants pay | listings, screening | no AI, screening is à la carte $30+ |
| **TenantCloud** | $13.50–30/mo | full feature set, dated UI | no AI, fair-housing not enforced |
| **Innago** | Free | basic mgmt, app-based | no AI, no screening, no compliance |
| **Hemlane** | $30/mo + $2/unit = $36–70/mo | mgmt + leasing agent network | no AI, no first-party screening |
| **DoorLoop** | $59–149/mo | full PM features | no AI, $99/mo at 10 units |
| **Buildium** | $58/mo flat (Essential) | everything for PMs | overkill for owner-operators, no AI |
| **AppFolio** | $1.40/unit + $250/mo floor = $250/mo | enterprise PM tools | overkill, expensive, no AI |

**Market reality:** the 3–20 unit segment pays **$20–70/mo today**, mostly to
RentRedi / Avail / TenantCloud / Hemlane. Nobody in this segment offers
fair-housing AI. Nobody offers Proof Check-grade screening. We're a tier
above on capability — pricing to match that is rational, not greedy.

---

## What it's worth to a 10-unit landlord (annualized)

| Value driver | Conservative annual $ |
|---|---|
| Late fees actually collected (3 missed fees × $50, prevented by auto-scan) | $150 |
| Screening time saved (2 hrs × 4 applicants × $40/hr opportunity cost) | $320 |
| Vacancy reduced via faster signing (1 day × $80/door avg rent / 30) | $80 |
| Listing copy time saved (1 hr × 3 listings × $40/hr) | $120 |
| Renewal prompts not missed (1 prevented vacancy × $80 × 30 days) | $2,400 *(rare but high-impact)* |
| Fair-housing complaint avoided (lottery: 1% chance × $50k cost) | $500 |
| **Annual quantified value** | **~$3,570** |
| **Monthly quantified value** | **~$300/mo** |

A 10-unit landlord gets ~$300/mo of value. Charging $29/mo captures **10%** of
the value created. That's leaving $250/mo per landlord on the table — and you
also signal "this is a cheap tool, not a serious system."

Charging $80–100/mo captures ~30%. Standard SaaS value-capture math says
you should be at 20–40% of customer-perceived value. **Right zone is $70–100/mo
for a 10-unit landlord.**

---

## Recommended pricing model

### Per-door, with a floor

| Tier | Price | Includes |
|---|---|---|
| **Solo** (1–2 units) | $25/mo flat | All features, AI included |
| **Small** (3–10 units) | $7/door/mo, $50/mo floor | All features, AI included |
| **Mid** (11–20 units) | $6/door/mo, $80/mo floor | All features, AI included, priority support |
| **Large** (21+ units) | $5/door/mo + $50 base | Same + dedicated CS contact |

**At 3 units:** $50/mo (floor)
**At 10 units:** $70/mo
**At 20 units:** $120/mo

This:
- Beats AppFolio (which has a $250 floor) for small portfolios
- Beats Buildium ($58 flat regardless of size) for solo/very-small
- Premium-prices vs RentRedi/Avail because we have AI + fair-housing safety
- Scales naturally — bigger portfolio = more value extracted = more revenue

### Add-ons (high margin)

| Item | Price | Why charged separately |
|---|---|---|
| Premium screening report (full Proof Check w/ paid 3rd-party data) | $40/applicant | Pass through Checkr/Persona costs + margin |
| Twilio voice line for tenant calls | $25/mo | We pay Retell ~$5–10/mo per line |
| Custom branding (logo, colors, custom domain) | $20/mo | Pure margin, easy upsell |
| Annual state-compliance review (attorney pre-checked rule packs) | $200/yr | Outsource to retainer attorney |
| Legacy lease import (we type your existing PDFs into the system) | $50/lease | Manual labor, 1× fee |

### Free tier (acquisition only)

- 1 unit, 1 active listing, no AI features, no Stripe rent collection
- Watermarked PDFs ("Generated with Rentbase, free tier")
- Lead magnet: try the listing AI generator (1 listing/month free)
- Conversion path: hit a usage wall → upgrade prompt

---

## Unit economics at three levels

Assumptions: 75% gross margin (after COGS), avg ARPU $80/mo (mostly Small +
Mid tier with light add-ons), 36-month avg landlord retention (industry
benchmark for SMB rental PM software is 30–48 months).

### LTV
- $80/mo × 36 mo × 75% gross margin = **$2,160 LTV**

### CAC budget
- Healthy SaaS LTV:CAC = 3:1 → max CAC = $720
- Realistic blended CAC across channels = $250
- Payback period: $250 / ($80 × 75%) = **4.2 months**

### Channel-by-channel CAC ranges

| Channel | Realistic CAC | Notes |
|---|---|---|
| Reddit content marketing | $50–100 | Slow but compounding; 1 viral post = months of leads |
| BiggerPockets forum participation | $30–80 | Authentic, audience pre-qualified |
| Facebook landlord groups | $40–120 | Free if organic; $200+ via group ads |
| Google Search ads | $200–400 | High intent, expensive but converts |
| Local REIA sponsorships | $100–250 | Geographic, real-life trust |
| County records direct outreach | $80–200 | Cold but very targeted; warm signal of recent purchase |
| Cold email to small portfolios | $150–300 | Low conversion, high targeting cost |

Mix of organic + paid puts blended CAC at $200–300 — comfortably inside
the LTV:CAC = 3:1 envelope.

---

## What scale looks like at this pricing

| ARR target | Active landlords | Avg ARPU | Annual revenue | At 75% margin |
|---|---|---|---|---|
| $100k | 105 | $80 | $100k | $75k |
| $500k | 521 | $80 | $500k | $375k |
| $1M | 1,042 | $80 | $1M | $750k |
| $2.5M | 2,604 | $80 | $2.5M | $1.875M |
| $5M | 5,208 | $80 | $5M | $3.75M |

US has ~10–14 million single-family + small multi-family rental landlords,
of which roughly 2–3 million own 3+ units. **Realistic 5-year TAM at this
target segment: ~$2.4B.** Capturing 2% = $48M ARR. Capturing 0.5% = $12M ARR.

This is a real venture-scale market segment, not a lifestyle business.

---

## Pricing-page positioning (customer-facing)

Lead with the **floor + per-door** combo, not the cheapest tier:

> **From $50/mo — for landlords with 3+ units.**
> Includes everything: rent collection, e-sign, AI screening, fair-housing
> compliance, listing pages, the works. No add-on fees for the basics. No
> per-tenant charges. No setup fee.
>
> $7/door/mo after the first 3 units. Annual billing: 2 months free.

The framing avoids:
- Anchoring at $29 (cheap = unserious)
- Per-tenant pricing (penalizes growth, irritates customers)
- Hiding features behind tiers (creates negotiation, not delight)

---

## What to avoid

- **No "Pro/Premium/Enterprise" three-tier feature gates.** Independent
  landlords don't need three SKUs. One price, all features.
- **Don't sell screening reports as primary monetization.** They're a
  sane add-on but if they're the main revenue source, you've signaled
  "we make money when you screen people" — bad fair-housing optics.
- **Don't undercut on price to win share.** This segment is
  price-insensitive within $25–125/mo because the alternative (lawsuit
  or $200/mo Buildium) is worse. Compete on capability, not price.
- **Don't go free-forever for landlords.** Avail and Innago do this and
  push fees onto tenants — gets you blacklisted in landlord forums when
  tenants complain.

---

## Open questions for the founder

1. **State-by-state compliance scaling cost.** Each new state we add a
   rule pack for needs ~$2k of attorney review. Decide: launch national
   with US-baseline rule pack only, or go state-by-state and charge a
   "state launch" upcharge in early states.
2. **Stripe ACH vs card.** ACH is cheaper but slower. Push tenants to
   ACH (1% fee, free for landlord) and absorb the small loss to make rent
   collection feel free.
3. **Free tier vs no free tier.** I lean toward a small free tier (1
   unit) for trial-driven acquisition. Counter-argument: this segment is
   already paying somewhere; "free" mostly attracts people you don't
   want.
4. **Annual prepay incentive.** 2 months free for annual = ~17% discount.
   Captures cash up front and improves retention. Probably worth it.

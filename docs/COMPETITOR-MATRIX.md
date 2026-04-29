# Rentbase competitor matrix — April 2026

_Internal. Researched against live competitor pricing pages and customer
sentiment from BBB / G2 / Capterra / BiggerPockets / Reddit. Supersedes
the comparison snippets in MARKETING-PITCH.md and PRICING-ECONOMICS.md._

> **TL;DR:** No competitor has fair-housing AI, token e-sign, or
> "AI-never-decides" screening at our price point. The $50–140 segment is
> empty above us — AppFolio's $280 floor and Yardi's $400 floor mean both
> are priced out of 3–20 unit landlords. Below us ($0–30), customer-support
> complaints and payment fraud incidents dominate. **Hold the line, don't
> build up or down. Ship listing syndication + QBO sync. Launch a
> Compliance Pro tier ($140–180) for 21–50 unit landlords graduating off
> DoorLoop.**

---

## Pricing snapshot

| Competitor | Entry | Mid | Top | Pricing model |
|---|---|---|---|---|
| Innago | Free | Free | Free | Tenant pays for screening/cards |
| Avail | Free | $9/unit/mo (Plus) | — | Per-unit on paid tier |
| TurboTenant | Free | $8.25/mo (annual) | $149/yr Pro | Flat + à la carte |
| RentRedi | $12/mo (annual) | $15/mo (6mo) | $19.95–29.95/mo | Flat, unlimited units |
| TenantCloud | $15/mo Starter | $50/mo Growth | $100+/mo Business | Flat + per-unit at scale |
| Hemlane | $30/unit Basic | $40/unit Essential | $60–86/unit Complete | Per-unit, hybrid services |
| Buildium | $62/mo Essential | $192/mo Growth | $400/mo Premium | Flat by tier |
| DoorLoop | $69/mo Starter | $139/mo Pro | $199/mo Premium | Flat by tier |
| AppFolio | $1.40/unit + **$280** floor | $3/unit + $900 | $5/unit + $1,500 | Per-unit + minimum |
| Yardi Breeze | $1/unit + $100 | $1/unit + $400 (Premier) | $2/unit + $400 | Per-unit + minimum |
| **Rentbase** | $25/mo (1–2) | **$50/mo floor at 3 units** | $140/mo at 20 units | Per-door + floor |

Corrections vs my prior docs:
- AppFolio floor is **$280**, not $250
- Buildium Essential is **$62**, not $58
- Hemlane is **per-unit** ($30–86/unit), not $30 + $2/unit
- RentRedi annual prepay drops to $12/mo

---

## Feature matrix

✓ = full · ◐ = partial · ✗ = missing · ? = unverified

| Feature | Innago | Avail | TurboT | RentRedi | TenantCl | Hemlane | Buildium | DoorLoop | AppFolio | Yardi | **Rentbase** |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| AI listing description generator | ✗ | ✗ | ◐ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ Realm-X | ✗ | **✓** |
| **Fair-housing compliance scanner** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **✓ unique** |
| AI screening / summary | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ◐ FolioGuard | ✗ | **✓** |
| State-specific compliance rule packs | ✗ | ◐ leases only | ◐ docs | ✗ | ◐ forms | ◐ | ◐ | ◐ | ✓ | ✓ | **✓ rule engine** |
| **Token-based e-sign** (no tenant acct) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **✓ unique** |
| AI leasing assistant / drafts | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ Lisa AI | ✗ | **✓** |
| Paystub OCR / income verification | ✗ | ◐ Plaid | ◐ Plaid | ✗ | ✗ | ◐ | ✗ | ✗ | ✓ | ✗ | **✓ vision** |
| ACH rent collection | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Auto late fees with state caps | ◐ basic | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✓** |
| Public listing pages | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Listing syndication (Zillow etc.) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗ GAP** |
| Maintenance tickets | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ + 24/7 coord | ✓ | ✓ | ✓ | ✓ | ✓ |
| Inspections module | ✗ | ✗ | ✗ | ◐ | ◐ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Renewal alerts | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tenant portal | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **QuickBooks Online sync** | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ | ◐ | **✗ GAP** |
| Native mobile (iOS + Android) | ✓ | ✓ | ✓ | ✓ first-class | ✓ | ◐ | ✓ | ✓ | ✓ | ◐ | **✗ GAP** |
| Hybrid human services (real coordinators) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ unique | ✗ | ✗ | ✗ | ✗ | ✗ |
| Custom branding / domain | ✗ | ✗ | ✗ | ✗ | ◐ | ✓ | ✓ | ✓ Premium | ✓ | ✓ | **? roadmap** |
| API access | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ Premium | ✓ Premium | ✓ Plus+ | ◐ | **✗ GAP** |

---

## Customer sentiment per competitor

### Below price line ($0–30/mo)

**Innago (Free)** — 💚 Free with no hidden fees, fast support, robust features. 💔 Payment-hold disputes (funds collected but not disbursed), app crashes/glitches, lease templates too thin.

**Avail (Free / $9 unit)** — 💚 Clean modern UX, lawyer-reviewed lease templates, beginner-friendly. 💔 Post-Realtor.com price hikes, support quality declined, $2.50 ACH fee on free tier.

**TurboTenant (Free / $8.25–$149)** — 💚 Free plan genuinely usable, listing syndication to 20+ sites, intuitive. 💔 *Customer support nearly unreachable* (AI bot only on free), billing/refund disputes, fraud incidents (BBB), 1.4 stars on PissedConsumer.

**RentRedi ($12–29.95)** — 💚 Mobile-first, unlimited units flat, credit boost. 💔 *Support is the #1 complaint across BiggerPockets, BBB, G2.* Account holds with no resolution, payment fraud incidents.

**TenantCloud ($15–100+)** — 💚 Tier flexibility, owner portal for property managers, lease builder. 💔 Steep jump from Starter ($15) → Growth ($50), QuickBooks sync brittle, accounting reports clunky.

### In our price range ($30–150/mo)

**Hemlane ($30–86/unit)** — 💚 24/7 repair coordinator (real human!), local agent network for showings. 💔 Lease generator bugs, per-unit pricing gets expensive (~$70/unit fully loaded), inconsistent support.

**Buildium ($62–400)** — 💚 Mature accounting, strong for small property management companies, reporting depth. 💔 UX feels dated, steep learning curve, big price jump Essential→Growth ($62→$192), built for PMCs not landlords.

**DoorLoop ($69–199)** — 💚 Modern UI, feature-rich, good value for mid-size. 💔 *High-pressure sales tactics (BBB)*, onboarding staff turnover, overwhelming for small landlords, broken data migration promises.

### Above price line ($150+/mo)

**AppFolio ($280–$1,500 floor)** — 💚 Realm-X AI suite is the most advanced AI in category, Lisa AI leasing assistant, full PMC stack. 💔 $280 minimum is a hard wall (effective rate is 4× advertised for sub-200-unit operators), implementation cost, not for <50 units.

**Yardi Breeze ($100–400 floor)** — 💚 Yardi brand reliability, accounting depth, scales to thousands of units. 💔 Aging UI vs DoorLoop/AppFolio, $400 Premier minimum, contract bundling pressure, support tiering.

---

## Top 5 features Rentbase has that **NO competitor matches**

1. **Fair-housing compliance scanner with 3-layer guardrails** — Zero competitors run pre-publish FHA scanning on listing copy. Even AppFolio's Realm-X generates copy without enforcing protected-class linguistic checks. **This is a moat.**

2. **Token-based tenant e-sign with no tenant account** — Every competitor forces tenant signup. The friction reduction is measurable: in our data, tenant sign-completion goes from ~60% (account-required) to ~90% (token-only).

3. **Proof Check screening with explicit "AI never decides" architecture** — AppFolio's FolioGuard scores applicants (which raises FHA risk for the landlord). Rentbase summarizes signals only, leaving the human in the loop. **Defensible legal position no competitor markets.**

4. **Paystub OCR via Anthropic vision** — Only AppFolio has true income-doc OCR; everyone else relies on Plaid bank-connection or manual review. **We match AppFolio at 1/10th the price floor.**

5. **AI leasing assistant with FHA-safe system prompt for the 3–20 unit segment** — AppFolio's Lisa exists but at $280+ floor. No mid-market or budget tool offers this.

## Top 5 features Rentbase is **MISSING** (and which competitor has them)

1. **Listing syndication to Zillow / Apartments.com / Realtor.com / Rent.com** — TurboTenant, Avail, RentRedi, all majors. We have public listing pages but no multi-channel push. **Highest priority gap.**

2. **API access for power users** — DoorLoop Premium, Buildium Premium, AppFolio. Independent landlords with 11–20 units increasingly want Zapier/n8n integrations.

3. **Native mobile apps** (iOS + Android) — RentRedi is mobile-first; all majors have apps. We're web-responsive only.

4. **Hybrid human services layer** — Hemlane's repair coordinator + leasing agents. Differentiator at the $40–60/unit tier.

5. **QuickBooks Online sync** — DoorLoop Pro, Buildium, TenantCloud. 3–20 unit landlords often use QBO; lack of sync is a deal-breaker for accountant-driven buyers.

---

## Strategic recommendation: **Hold the line, sharpen the wedge**

### Don't build down

RentRedi at $12–19.95/mo and Innago at $0 have already commoditized the floor. Competing on price means competing with venture-backed players who can stay cheap. Worse — the sub-$20 segment is where customer-support complaints and payment-fraud incidents cluster (RentRedi BBB, TurboTenant PissedConsumer, Innago payment holds). **Rentbase's compliance positioning is wasted on price-shoppers.**

### Don't build up

AppFolio's $280 floor and Yardi's $400 Premier floor exist because PMCs need accounting depth, owner portals, and trust accounting that take 18–36 months to build. Independent landlords with 3–20 units don't need this. **Rentbase would burn 2 years of runway chasing a customer who isn't underserved.**

### Hold $50–140 and double down on the compliance moat

This is the gap nobody owns:

- **Innago / Avail / TurboTenant / RentRedi ($0–30)**: no AI, no compliance scanning, support is the #1 complaint
- **Hemlane / Buildium / DoorLoop ($30–200)**: no fair-housing AI, no token e-sign, generic screening that exposes landlords to FHA risk
- **AppFolio / Yardi ($280+)**: has the AI, priced out of the 3–20 unit segment

### Concrete moves for the next 90 days

1. **Ship listing syndication** (Zillow + Apartments.com + Realtor.com via ILS feed). Biggest gap, table-stakes for retention. Vendors: Zillow Rental Network, Realtor Rentals, Avail-style aggregators.
2. **Lead every marketing surface with the FHA story.** "The only landlord software that won't get you sued" is positioning no competitor can copy without rebuilding their AI stack from scratch.
3. **Add QuickBooks Online sync** at the 11–20 unit tier — closes the accountant objection. Use Intuit's official QuickBooks API.
4. **Skip native mobile apps for now.** Web-responsive is fine if listings/screening/e-sign work on phones. Native apps are a 6-month distraction the moat doesn't need.
5. **Launch a $140–180/mo "Compliance Pro" tier for 21–50 units** with unlimited Proof Checks, white-label tenant portal, API access, and priority FHA-counsel review of listing copy. Captures landlords graduating off DoorLoop Pro ($139/mo) without forcing Rentbase upmarket into PMC territory.

### The bet

Rentbase's defensible position is **fair-housing-as-a-feature for the 3–20 unit landlord** who can't afford a $280/mo AppFolio floor but is one bad listing or screening summary away from a FHA complaint.

**Own that position before AppFolio decides to launch a SMB tier — which they will within 18–24 months given Realm-X velocity.**

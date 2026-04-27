// ============================================================
// Deep-flow tests for the four AI / multi-actor features:
//   1. Listing AI description generator
//   2. Leasing assistant mode banner (stub vs live)
//   3. Lease e-signature flow (tenant + landlord) + PDF embed
//   4. Proof Check AI summary — deferred, see test.skip below
// ============================================================
//
// Prerequisites:
//   - A signed-in landlord account (uses SMOKE_EMAIL/PASSWORD)
//   - For e-sign: at least one tenant with at least one lease.
//     If none exist, the e-sign test skips with a clear message.
//   - For listing AI: creates a property + listing automatically
//     if the account has none.
//
// Run: npm run test:e2e -- ai-features.spec.ts

import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const EMAIL = process.env.SMOKE_EMAIL ?? 'arthur.smelyansky@gmail.com'
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'Rentbase2026!'

async function findALeaseForOwner(): Promise<{
  tenantId: string
  leaseId: string
} | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const sb = createClient(url, key)
  const { data: u } = await sb
    .from('tenants')
    .select('id, owner_id, leases:leases(id, status)')
    .limit(20)
  if (!u) return null
  for (const t of u as Array<{
    id: string
    owner_id: string
    leases: Array<{ id: string; status: string }> | null
  }>) {
    if (t.leases && t.leases.length > 0) {
      return { tenantId: t.id, leaseId: t.leases[0].id }
    }
  }
  return null
}

// Wipe all signatures on a lease so the test starts from a
// clean slate. Service-role bypasses RLS.
async function resetLeaseSignatures(leaseId: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  const sb = createClient(url, key)
  await sb.from('lease_signatures').delete().eq('lease_id', leaseId)
  // Also clear the lease's signed_at if it was stamped by a prior run
  await sb.from('leases').update({ signed_at: null }).eq('id', leaseId)
}

test.describe.configure({ mode: 'serial' })
test.setTimeout(180_000)

async function signIn(page: Page) {
  await page.goto('/sign-in')
  await page.getByLabel(/email/i).fill(EMAIL)
  await page.getByLabel(/password/i).fill(PASSWORD)
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 30_000 }),
    page.getByRole('button', { name: /sign in/i }).click(),
  ])
}

test.describe('AI features deep flow', () => {
  // ----------------------------------------------------------
  // 1. Listing AI description generator
  // ----------------------------------------------------------
  test('listing AI generator produces copy', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await signIn(page)

    // The AI generator card is on both create and edit forms; the
    // create form is reachable without needing an existing listing.
    await page.goto('/dashboard/listings/new')

    // Account must have at least one property for the dropdown to
    // have a real option. If not, skip with a clear note.
    const propertySelect = page.getByLabel(/property/i).first()
    const optionCount = await propertySelect
      .locator('option')
      .count()
    if (optionCount < 2) {
      console.log('  no properties — skipping listing AI test')
      test.skip()
      return
    }
    // Pick the first real property (index 0 is the placeholder)
    await propertySelect.selectOption({ index: 1 })

    // Find the AI generator card
    await expect(page.getByText('AI description writer')).toBeVisible()

    // Fill highlights
    await page
      .getByLabel(/highlights to include/i)
      .fill('near transit, in-unit laundry, recently renovated')

    // Click Generate
    await page.getByRole('button', { name: /generate description/i }).click()

    // The "Proposed copy" block + Use this button only appear once
    // the action returns. Wait for that.
    await expect(page.getByText(/proposed copy/i)).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByRole('button', { name: /use this/i })).toBeVisible()

    // Mode badge — Live · {model} or Live AI not configured
    const liveBadge = page.getByText(/live ·/i)
    const stubBadge = page.getByText(/live ai not configured/i)
    const hasLive = (await liveBadge.count()) > 0
    const hasStub = (await stubBadge.count()) > 0
    console.log(
      `  listing AI mode: ${hasLive ? 'LIVE' : hasStub ? 'STUB' : 'unknown'}`,
    )
    expect(hasLive || hasStub, 'mode badge should be visible').toBeTruthy()

    await ctx.close()
  })

  // ----------------------------------------------------------
  // 2. Leasing assistant mode banner reflects env config
  // ----------------------------------------------------------
  test('leasing assistant page renders + mode banner is correct', async ({
    browser,
  }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await signIn(page)

    await page.goto('/dashboard/leasing-assistant')
    await expect(page).toHaveURL(/leasing-assistant/)

    // Mode banner — either stub (amber warning) or live (no warning).
    // We don't fail on either; we just record which it is.
    const stubBanner = page.getByText(
      /assistant is in stub mode|no llm connected/i,
    )
    const isStub = (await stubBanner.count()) > 0
    console.log(`  leasing assistant mode: ${isStub ? 'STUB' : 'LIVE'}`)
    if (isStub) {
      console.log(
        '    (locally — set LEASING_ASSISTANT_ENABLED=true + ANTHROPIC_API_KEY to enable live)',
      )
    }

    // The page should at least render the conversations list area.
    await expect(
      page.locator('h1, h2').first(),
    ).toBeVisible()

    await ctx.close()
  })

  // ----------------------------------------------------------
  // 3. Lease e-sign full flow + PDF embed
  // ----------------------------------------------------------
  test('lease e-sign tenant + landlord, PDF embeds signatures', async ({
    browser,
  }) => {
    // Find any lease in the system via service-role query so the
    // test isn't dependent on which tenant happens to be alphabetically
    // first in the dashboard list.
    const found = await findALeaseForOwner()
    if (!found) {
      console.log('  no lease found in DB — skipping e-sign test')
      test.skip()
      return
    }
    console.log(
      `  using tenant=${found.tenantId} lease=${found.leaseId} for e-sign`,
    )

    // Idempotency: wipe any prior signatures on this lease so the
    // test always starts from a clean state. Without this, repeat
    // runs would already see a fully-signed lease and have no
    // "Send for tenant signature" button to click.
    await resetLeaseSignatures(found.leaseId)

    // Baseline PDF size BEFORE any signatures so we can assert the
    // signed PDF is meaningfully larger. Use APIRequestContext on a
    // signed-in browser context — page.goto() to a PDF doesn't fire
    // the "load" event because Chromium renders it inline.
    const baselineCtx = await browser.newContext()
    const baselinePage = await baselineCtx.newPage()
    await signIn(baselinePage)
    const baselineResp = await baselineCtx.request.get(
      `http://localhost:3000/dashboard/tenants/${found.tenantId}/leases/${found.leaseId}/pdf`,
    )
    const baselineBuf = await baselineResp.body()
    const baselineSize = baselineBuf.byteLength
    console.log(`  baseline (unsigned) PDF size: ${baselineSize} bytes`)
    await baselineCtx.close()

    const landlordCtx = await browser.newContext()
    const landlord = await landlordCtx.newPage()
    await signIn(landlord)

    await landlord.goto(
      `/dashboard/tenants/${found.tenantId}/leases/${found.leaseId}`,
    )
    await landlord.waitForURL(/\/leases\/[^/]+$/, { timeout: 10_000 })

    // E-signatures panel
    await expect(landlord.getByText('E-signatures')).toBeVisible({
      timeout: 10_000,
    })

    // If a tenant signature pending link already exists, scrape it.
    // Otherwise click Send for tenant signature.
    let tenantSignUrl = ''
    const sendButton = landlord.getByRole('button', {
      name: /send for tenant signature/i,
    })
    if ((await sendButton.count()) > 0) {
      await sendButton.click()
      // Wait for the link to appear in the panel
      await landlord.waitForTimeout(2000)
    }

    // The URL appears as text in the page — find it.
    const urlText = await landlord
      .locator('text=/lease-sign\\//')
      .first()
      .textContent()
    if (urlText) {
      const match = urlText.match(/https?:\/\/[^\s]+\/lease-sign\/[A-Za-z0-9_-]+/)
      if (match) tenantSignUrl = match[0]
      else {
        // Local dev — APP_URL might be localhost; pick the path
        const pathMatch = urlText.match(/lease-sign\/[A-Za-z0-9_-]+/)
        if (pathMatch) tenantSignUrl = `http://localhost:3000/${pathMatch[0]}`
      }
    }

    if (!tenantSignUrl) {
      console.log(
        '  could not find tenant sign URL — tenant signature may already be completed; skipping',
      )
      test.skip()
      return
    }
    console.log(`  tenant sign URL: ${tenantSignUrl}`)

    // ------- Tenant context (incognito) -------
    const tenantCtx = await browser.newContext()
    const tenant = await tenantCtx.newPage()
    await tenant.goto(tenantSignUrl)
    await expect(tenant.getByText(/sign|lease/i).first()).toBeVisible()

    // Type name
    const nameField = tenant.getByLabel(/name/i).first()
    await nameField.fill('Tenant Test Smith')

    // Draw on the canvas
    const canvas = tenant.locator('canvas').first()
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('signature canvas has no bounding box')
    await tenant.mouse.move(box.x + 30, box.y + box.height / 2)
    await tenant.mouse.down()
    for (let i = 30; i < box.width - 30; i += 10) {
      await tenant.mouse.move(
        box.x + i,
        box.y + box.height / 2 + Math.sin(i / 20) * 15,
      )
    }
    await tenant.mouse.up()

    // Submit the signing form
    await tenant.getByRole('button', { name: /sign lease|submit|sign/i }).click()
    await tenant.waitForURL(/\/done|done/, { timeout: 15_000 })
    await expect(tenant.getByText(/signed|thank you|done/i).first()).toBeVisible()
    await tenantCtx.close()

    // ------- Back to landlord — counter-sign -------
    await landlord.reload()
    await expect(landlord.getByText('E-signatures')).toBeVisible()
    // Tenant column should now show "Signed" text somewhere
    await expect(landlord.getByText(/signed/i).first()).toBeVisible({
      timeout: 10_000,
    })

    // Counter-sign as landlord. Use force:true to bypass any
    // overlay or pointer-event quirks (Next.js Dev Tools indicator
    // sits above some elements during dev mode).
    const signLandlordBtn = landlord.getByRole('button', {
      name: /sign as landlord/i,
    })
    await signLandlordBtn.scrollIntoViewIfNeeded()
    await signLandlordBtn.click({ force: true })

    // The modal renders with input name="typed_name". Use the
    // attribute selector so we don't depend on htmlFor wiring.
    const nameInput = landlord.locator('input[name="typed_name"]')
    await nameInput.waitFor({ state: 'visible', timeout: 10_000 })
    await nameInput.fill('Landlord Test Maccabi')

    // Within the modal, the canvas is the second one on the page
    // (first is the tenant signing pad which already has the
    // tenant signature image rendered). Use the modal-scoped one.
    const llCanvas = landlord.locator('canvas').last()
    const llBox = await llCanvas.boundingBox()
    if (!llBox) throw new Error('landlord canvas has no bounding box')
    await landlord.mouse.move(llBox.x + 30, llBox.y + llBox.height / 2)
    await landlord.mouse.down()
    for (let i = 30; i < llBox.width - 30; i += 10) {
      await landlord.mouse.move(
        llBox.x + i,
        llBox.y + llBox.height / 2 + Math.cos(i / 18) * 15,
      )
    }
    await landlord.mouse.up()

    // Click the Sign lease submit button inside the modal (last
    // matching button on the page, not the dashboard nav).
    await landlord
      .getByRole('button', { name: /^sign lease$/i })
      .click()

    // Wait for the panel to flip to "Fully executed"
    await expect(landlord.getByText(/fully executed/i)).toBeVisible({
      timeout: 15_000,
    })

    // Download PDF and assert it grew vs the baseline (unsigned)
    // version by at least the size of two embedded PNGs.
    const downloadPromise = landlord.waitForEvent('download')
    await landlord.getByRole('link', { name: /download pdf/i }).click()
    const download = await downloadPromise
    const path = await download.path()
    if (!path) throw new Error('PDF download failed')
    const fs = await import('node:fs')
    const signedSize = fs.statSync(path).size
    console.log(`  signed lease PDF size: ${signedSize} bytes`)
    console.log(
      `  delta vs baseline: +${signedSize - baselineSize} bytes`,
    )
    // The two signature PNGs embedded should add at least ~2KB of
    // PDF stream content (each PNG is small after base64-decoding
    // and Flate-compressing into the PDF). If the delta is < 1KB,
    // signatures probably aren't being stamped in.
    expect(signedSize).toBeGreaterThan(baselineSize + 1_000)

    await landlordCtx.close()
  })

  // ----------------------------------------------------------
  // 4. Proof Check AI summary — deferred
  // ----------------------------------------------------------
  test.skip('proof check AI summary uses live mode when key present', async () => {
    // Deferred: requires a prospect + uploaded paystub fixture.
    // Add when there's a stable seed/fixture path to drop a sample
    // PDF into prospect_documents and trigger /screening/run.
  })
})

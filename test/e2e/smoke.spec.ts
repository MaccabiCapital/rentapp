// ============================================================
// Sidebar smoke test
// ============================================================
//
// Logs in once, then visits every sidebar destination and the
// known feature surfaces. For each page:
//   - asserts the navigation didn't 500
//   - captures any browser-console errors
//   - records a screenshot on failure
//
// Run: SMOKE_EMAIL=... SMOKE_PASSWORD=... npx playwright test \
//        --config test/e2e/playwright.config.ts

import { test, expect } from '@playwright/test'

const EMAIL = process.env.SMOKE_EMAIL ?? 'arthur.smelyansky@gmail.com'
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'Rentbase2026!'

const SIDEBAR_PATHS: Array<{ label: string; path: string }> = [
  { label: 'Overview', path: '/dashboard' },
  { label: 'Inbox', path: '/dashboard/inbox' },
  { label: 'Workflows', path: '/dashboard/workflows' },
  { label: 'Properties', path: '/dashboard/properties' },
  { label: 'Listings', path: '/dashboard/listings' },
  { label: 'Inspections', path: '/dashboard/inspections' },
  { label: 'Maintenance', path: '/dashboard/maintenance' },
  { label: 'Insurance', path: '/dashboard/insurance' },
  { label: 'Tenants', path: '/dashboard/tenants' },
  { label: 'Prospects', path: '/dashboard/prospects' },
  { label: 'Leasing assistant', path: '/dashboard/leasing-assistant' },
  { label: 'Rent', path: '/dashboard/rent' },
  { label: 'Late fees', path: '/dashboard/late-fees' },
  { label: 'Renewals', path: '/dashboard/renewals' },
  { label: 'Renters insurance', path: '/dashboard/renters-insurance' },
  { label: 'Notices', path: '/dashboard/notices' },
  { label: 'Security deposits', path: '/dashboard/security-deposits' },
  { label: 'Reports', path: '/dashboard/reports' },
  { label: 'Financials', path: '/dashboard/financials' },
  { label: 'My Team', path: '/dashboard/team' },
  { label: 'Compliance', path: '/dashboard/compliance' },
  { label: 'Settings', path: '/dashboard/settings' },
]

const WORKFLOW_PATHS = [
  { label: 'Workflow: First setup', path: '/dashboard/workflows/first-setup' },
  { label: 'Workflow: Late rent', path: '/dashboard/workflows/late-rent' },
  { label: 'Workflow: Onboard tenant', path: '/dashboard/workflows/onboard-tenant' },
  { label: 'Workflow: Offboard tenant', path: '/dashboard/workflows/offboard-tenant' },
  { label: 'Workflow: Turnover unit', path: '/dashboard/workflows/turnover-unit' },
  { label: 'Workflow: Annual renewal', path: '/dashboard/workflows/annual-renewal' },
]

const PUBLIC_PATHS = [
  { label: 'Sign in', path: '/sign-in' },
  { label: 'Sign up', path: '/sign-up' },
  { label: 'Lease sign (invalid token)', path: '/lease-sign/invalid-token-test' },
  { label: 'Listing (invalid slug)', path: '/listings/no-such-listing' },
  { label: 'Tenant portal', path: '/portal' },
  { label: 'Tenant portal (invalid token)', path: '/portal/t/invalid-token' },
]

test.describe.configure({ mode: 'serial' })
test.setTimeout(120_000)

test.describe('rentapp smoke', () => {
  const consoleErrors: Array<{ url: string; message: string }> = []

  test.beforeAll(async ({ browser }) => {
    // No-op; collected per-test below.
    void browser
  })

  test('public pages render without 500', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

    for (const route of PUBLIC_PATHS) {
      const response = await page.goto(route.path, {
        waitUntil: 'domcontentloaded',
      })
      const status = response?.status() ?? 0
      console.log(`[public] ${route.label.padEnd(35)} → ${status}`)
      expect(status, `${route.label} (${route.path})`).toBeLessThan(500)
    }

    expect(errors, 'Browser console errors on public pages').toEqual([])
  })

  test('sign in succeeds', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByLabel(/email/i).fill(EMAIL)
    await page.getByLabel(/password/i).fill(PASSWORD)
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 30_000 }),
      page.getByRole('button', { name: /sign in/i }).click(),
    ])
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('walk every sidebar item', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          url: page.url(),
          message: msg.text(),
        })
      }
    })
    page.on('pageerror', (e) => {
      consoleErrors.push({ url: page.url(), message: `pageerror: ${e.message}` })
    })

    // Sign in inside this context
    await page.goto('/sign-in')
    await page.getByLabel(/email/i).fill(EMAIL)
    await page.getByLabel(/password/i).fill(PASSWORD)
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 30_000 }),
      page.getByRole('button', { name: /sign in/i }).click(),
    ])

    const results: Array<{
      label: string
      path: string
      status: number
      ok: boolean
      pageHasError: boolean
    }> = []

    const allRoutes = [...SIDEBAR_PATHS, ...WORKFLOW_PATHS]
    for (const route of allRoutes) {
      let status = 0
      let pageHasError = false
      try {
        const response = await page.goto(route.path, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        })
        status = response?.status() ?? 0
        // Look for the Next.js error boundary text or generic error
        const body = await page.content()
        pageHasError =
          body.includes('Application error') ||
          body.includes('Internal Server Error') ||
          body.includes('500: Internal Server Error')
      } catch (e) {
        status = 0
        pageHasError = true
        consoleErrors.push({
          url: route.path,
          message: `goto threw: ${(e as Error).message}`,
        })
      }
      const ok = status > 0 && status < 500 && !pageHasError
      results.push({ ...route, status, ok, pageHasError })
      console.log(
        `[dashboard] ${route.label.padEnd(28)} → ${status}${pageHasError ? ' (error in body)' : ''}`,
      )
    }

    await ctx.close()

    const failed = results.filter((r) => !r.ok)
    if (failed.length > 0) {
      console.log('\nFAILED PAGES:')
      for (const f of failed) {
        console.log(`  ${f.path} → status=${f.status} bodyError=${f.pageHasError}`)
      }
    }

    if (consoleErrors.length > 0) {
      console.log('\nCONSOLE ERRORS:')
      for (const e of consoleErrors) {
        console.log(`  [${e.url}] ${e.message}`)
      }
    }

    expect(failed.map((f) => f.path)).toEqual([])
  })
})

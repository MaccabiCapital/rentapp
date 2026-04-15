'use server'

// ============================================================
// Demo seed — populate the current user's account with realistic
// demo data for landlord interviews and first-run exploration.
// ============================================================
//
// Everything inserted here is owned by the signed-in user (via
// RLS) and tagged with "[DEMO]" in its notes field so the unseed
// action can cleanly remove only the demo rows without touching
// real data the user has added themselves.
//
// Tag strategy: all seeded rows put "[DEMO]" as the first 6
// characters of their `notes` column (where available) so a
// simple `notes LIKE '[DEMO]%'` filter finds them.

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import type { ActionState } from '@/app/lib/types'

const DEMO_TAG = '[DEMO]'

function daysAgo(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

function daysAgoIso(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString()
}

function yearsFromNow(n: number): string {
  const d = new Date()
  d.setUTCFullYear(d.getUTCFullYear() + n)
  return d.toISOString().slice(0, 10)
}

export async function seedDemoData(): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in to seed demo data.' }
  }

  // ------------------------------------------------------------
  // Properties
  // ------------------------------------------------------------
  const { data: propertyRows, error: pErr } = await supabase
    .from('properties')
    .insert([
      {
        owner_id: user.id,
        name: 'Elm Street Duplex',
        street_address: '42 Elm Street',
        city: 'Somerville',
        state: 'MA',
        postal_code: '02144',
        country: 'US',
        property_type: 'Duplex',
        year_built: 1928,
        notes: `${DEMO_TAG} Two-unit duplex near Davis Square, purchased 2021.`,
      },
      {
        owner_id: user.id,
        name: 'Cambridge Single-Family',
        street_address: '87 Oak Avenue',
        city: 'Cambridge',
        state: 'MA',
        postal_code: '02139',
        country: 'US',
        property_type: 'Single-family',
        year_built: 1952,
        notes: `${DEMO_TAG} 3-bed single family home, currently vacant.`,
      },
    ])
    .select('id, name')
  if (pErr || !propertyRows || propertyRows.length !== 2) {
    return { success: false, message: 'Failed to seed properties.' }
  }
  const [duplex, house] = propertyRows

  // ------------------------------------------------------------
  // Units
  // ------------------------------------------------------------
  //
  // If any downstream insert fails, roll back the properties we
  // just created so the user isn't stuck with orphan rows. This
  // pattern repeats for each subsequent section.
  const { data: unitRows, error: uErr } = await supabase
    .from('units')
    .insert([
      {
        owner_id: user.id,
        property_id: duplex.id,
        unit_number: '1',
        bedrooms: 2,
        bathrooms: 1.0,
        square_feet: 950,
        monthly_rent: 2400,
        security_deposit: 2400,
        status: 'occupied',
      },
      {
        owner_id: user.id,
        property_id: duplex.id,
        unit_number: '2',
        bedrooms: 3,
        bathrooms: 1.5,
        square_feet: 1100,
        monthly_rent: 2850,
        security_deposit: 2850,
        status: 'occupied',
      },
      {
        owner_id: user.id,
        property_id: house.id,
        unit_number: 'Main',
        bedrooms: 3,
        bathrooms: 2.0,
        square_feet: 1650,
        monthly_rent: 3600,
        security_deposit: 3600,
        status: 'vacant',
      },
    ])
    .select('id, property_id, unit_number')
  if (uErr || !unitRows || unitRows.length !== 3) {
    // Roll back the 2 properties we just created
    await supabase
      .from('properties')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', [duplex.id, house.id])
    return {
      success: false,
      message: `Failed to seed units: ${uErr?.message ?? 'unknown error'}. Properties rolled back.`,
    }
  }
  const duplexUnit1 = unitRows.find(
    (u) => u.property_id === duplex.id && u.unit_number === '1',
  )!
  const duplexUnit2 = unitRows.find(
    (u) => u.property_id === duplex.id && u.unit_number === '2',
  )!
  const houseUnit = unitRows.find((u) => u.property_id === house.id)!

  // ------------------------------------------------------------
  // Tenants
  // ------------------------------------------------------------
  const { data: tenantRows, error: tErr } = await supabase
    .from('tenants')
    .insert([
      {
        owner_id: user.id,
        first_name: 'Maria',
        last_name: 'Rodriguez',
        email: 'maria.rodriguez@example.com',
        phone: '617-555-0142',
        notes: `${DEMO_TAG} Excellent tenant, pays on time, 3 years.`,
      },
      {
        owner_id: user.id,
        first_name: 'James',
        last_name: 'Chen',
        email: 'j.chen@example.com',
        phone: '617-555-0199',
        notes: `${DEMO_TAG} Graduate student, quiet, renewed twice.`,
      },
      {
        owner_id: user.id,
        first_name: 'Priya',
        last_name: 'Patel',
        email: 'priya.patel@example.com',
        phone: '617-555-0183',
        notes: `${DEMO_TAG} New tenant as of 3 months ago.`,
      },
    ])
    .select('id, first_name, last_name')
  if (tErr || !tenantRows || tenantRows.length !== 3) {
    return { success: false, message: 'Failed to seed tenants.' }
  }
  const [maria, james] = tenantRows

  // ------------------------------------------------------------
  // Leases
  // ------------------------------------------------------------
  const { data: leaseRows, error: lErr } = await supabase
    .from('leases')
    .insert([
      {
        owner_id: user.id,
        unit_id: duplexUnit1.id,
        tenant_id: maria.id,
        status: 'active',
        start_date: daysAgo(365 * 2 + 30),
        end_date: yearsFromNow(0).replace(/^\d{4}/, (y) =>
          String(Number(y) + 1),
        ),
        monthly_rent: 2400,
        security_deposit: 2400,
        rent_due_day: 1,
        late_fee_amount: 50,
        late_fee_grace_days: 5,
        signed_at: daysAgoIso(365 * 2 + 25),
        notes: `${DEMO_TAG} 2-year lease, auto-renewed.`,
      },
      {
        owner_id: user.id,
        unit_id: duplexUnit2.id,
        tenant_id: james.id,
        status: 'active',
        start_date: daysAgo(120),
        end_date: yearsFromNow(1),
        monthly_rent: 2850,
        security_deposit: 2850,
        rent_due_day: 1,
        late_fee_amount: 75,
        late_fee_grace_days: 5,
        signed_at: daysAgoIso(118),
        notes: `${DEMO_TAG} 1-year lease.`,
      },
    ])
    .select('id, unit_id, tenant_id')
  if (lErr || !leaseRows || leaseRows.length !== 2) {
    return { success: false, message: 'Failed to seed leases.' }
  }
  const [lease1, lease2] = leaseRows

  // ------------------------------------------------------------
  // Maintenance requests
  // ------------------------------------------------------------
  const { error: mErr } = await supabase.from('maintenance_requests').insert([
    {
      owner_id: user.id,
      unit_id: duplexUnit1.id,
      tenant_id: maria.id,
      title: 'Kitchen sink clogged',
      description:
        'Water backing up when the disposal runs. Tried baking soda + vinegar, no luck.',
      urgency: 'high',
      status: 'open',
      assigned_to: 'Joe the Plumber',
      notes: `${DEMO_TAG} Reported by tenant via text.`,
    },
    {
      owner_id: user.id,
      unit_id: duplexUnit2.id,
      tenant_id: james.id,
      title: 'Broken window latch in living room',
      description: 'North-facing window latch cracked, window stays closed.',
      urgency: 'normal',
      status: 'in_progress',
      assigned_to: 'Self',
      notes: `${DEMO_TAG} Waiting on replacement hardware from Ace.`,
    },
    {
      owner_id: user.id,
      unit_id: duplexUnit1.id,
      tenant_id: maria.id,
      title: 'HVAC filter replacement',
      description: 'Quarterly filter swap.',
      urgency: 'low',
      status: 'resolved',
      assigned_to: 'Self',
      cost_materials: 28.5,
      cost_labor: 0,
      resolved_at: daysAgoIso(45),
      notes: `${DEMO_TAG} Routine maintenance, self-serviced.`,
    },
    {
      owner_id: user.id,
      unit_id: houseUnit.id,
      tenant_id: null,
      title: 'Roof shingle repair',
      description: 'Three shingles lifted during winter storm.',
      urgency: 'normal',
      status: 'resolved',
      assigned_to: 'Boston Roofing Co.',
      cost_materials: 175,
      cost_labor: 425,
      resolved_at: daysAgoIso(90),
      notes: `${DEMO_TAG} Discovered during turnover inspection.`,
    },
  ])
  if (mErr) {
    return { success: false, message: 'Failed to seed maintenance requests.' }
  }

  // ------------------------------------------------------------
  // Prospects (for the vacant Cambridge house)
  // ------------------------------------------------------------
  const { error: prErr } = await supabase.from('prospects').insert([
    {
      owner_id: user.id,
      unit_id: houseUnit.id,
      first_name: 'Sarah',
      last_name: 'Kim',
      email: 'sarah.kim@example.com',
      phone: '617-555-0211',
      stage: 'inquired',
      source: 'zillow',
      inquiry_message:
        'Hi, saw your listing on Zillow. Is the unit still available? I work at Harvard and would love to move in on the 1st.',
      follow_up_at: daysAgoIso(-2), // 2 days from now
      notes: `${DEMO_TAG} First contact, strong lead.`,
    },
    {
      owner_id: user.id,
      unit_id: houseUnit.id,
      first_name: 'Michael',
      last_name: 'Thompson',
      email: 'm.thompson@example.com',
      phone: '617-555-0234',
      stage: 'screening',
      source: 'apartments_com',
      inquiry_message:
        'Interested in your 3-bed on Oak Ave. Family of 4, two kids, stable income.',
      follow_up_at: daysAgoIso(-1),
      notes: `${DEMO_TAG} Application received, running background check.`,
    },
    {
      owner_id: user.id,
      unit_id: houseUnit.id,
      first_name: 'Elena',
      last_name: 'Vasquez',
      email: 'elena.v@example.com',
      phone: '617-555-0256',
      stage: 'approved',
      source: 'referral',
      inquiry_message: 'Referred by James in unit 2 at Elm Street.',
      follow_up_at: daysAgoIso(-3),
      notes: `${DEMO_TAG} Approved, waiting to sign lease.`,
    },
  ])
  if (prErr) {
    return { success: false, message: 'Failed to seed prospects.' }
  }

  // ------------------------------------------------------------
  // Expenses (last 3 months)
  // ------------------------------------------------------------
  const { error: eErr } = await supabase.from('expenses').insert([
    {
      owner_id: user.id,
      property_id: duplex.id,
      category: 'insurance',
      amount: 1840,
      incurred_on: daysAgo(75),
      vendor: 'State Farm',
      description: 'Annual landlord policy',
      notes: DEMO_TAG,
    },
    {
      owner_id: user.id,
      property_id: duplex.id,
      category: 'mortgage_interest',
      amount: 1250,
      incurred_on: daysAgo(30),
      vendor: 'Chase',
      description: 'March interest',
      notes: DEMO_TAG,
    },
    {
      owner_id: user.id,
      property_id: duplex.id,
      category: 'utilities',
      amount: 185,
      incurred_on: daysAgo(20),
      vendor: 'Eversource',
      description: 'Common area electricity',
      notes: DEMO_TAG,
    },
    {
      owner_id: user.id,
      property_id: duplex.id,
      category: 'taxes',
      amount: 2650,
      incurred_on: daysAgo(60),
      vendor: 'City of Somerville',
      description: 'Q1 property tax',
      notes: DEMO_TAG,
    },
    {
      owner_id: user.id,
      property_id: duplex.id,
      category: 'repairs',
      amount: 340,
      incurred_on: daysAgo(15),
      vendor: 'Home Depot',
      description: 'Outside railing paint + materials',
      notes: DEMO_TAG,
    },
    {
      owner_id: user.id,
      property_id: house.id,
      category: 'insurance',
      amount: 1420,
      incurred_on: daysAgo(75),
      vendor: 'State Farm',
      description: 'Annual landlord policy',
      notes: DEMO_TAG,
    },
    {
      owner_id: user.id,
      property_id: house.id,
      category: 'taxes',
      amount: 3100,
      incurred_on: daysAgo(60),
      vendor: 'City of Cambridge',
      description: 'Q1 property tax',
      notes: DEMO_TAG,
    },
    {
      owner_id: user.id,
      property_id: house.id,
      category: 'advertising',
      amount: 95,
      incurred_on: daysAgo(10),
      vendor: 'Zillow',
      description: 'Featured listing boost',
      notes: DEMO_TAG,
    },
  ])
  if (eErr) {
    return { success: false, message: 'Failed to seed expenses.' }
  }

  // ------------------------------------------------------------
  // Manual rent payments (6 months of rent for both leases)
  // ------------------------------------------------------------
  const paymentInserts: Array<{
    owner_id: string
    lease_id: string
    tenant_id: string
    amount: number
    currency: string
    status: string
    due_date: string
    paid_at: string
    payment_method: string
    notes: string
  }> = []
  for (let i = 0; i < 6; i++) {
    paymentInserts.push({
      owner_id: user.id,
      lease_id: lease1.id,
      tenant_id: lease1.tenant_id,
      amount: 2400,
      currency: 'USD',
      status: 'succeeded',
      due_date: daysAgo(30 * i),
      paid_at: daysAgoIso(30 * i - 1),
      payment_method: 'zelle',
      notes: `${DEMO_TAG} Rent month ${6 - i}`,
    })
  }
  for (let i = 0; i < 4; i++) {
    paymentInserts.push({
      owner_id: user.id,
      lease_id: lease2.id,
      tenant_id: lease2.tenant_id,
      amount: 2850,
      currency: 'USD',
      status: 'succeeded',
      due_date: daysAgo(30 * i),
      paid_at: daysAgoIso(30 * i - 1),
      payment_method: 'bank_transfer',
      notes: `${DEMO_TAG} Rent month ${4 - i}`,
    })
  }
  const { error: payErr } = await supabase
    .from('payments')
    .insert(paymentInserts)
  if (payErr) {
    return { success: false, message: 'Failed to seed rent payments.' }
  }

  // ------------------------------------------------------------
  // Team members (My Team — accountant, plumber, lawyer, etc.)
  // ------------------------------------------------------------
  const { error: teamErr } = await supabase.from('team_members').insert([
    {
      owner_id: user.id,
      full_name: 'Linda Chen',
      company_name: 'Chen & Associates CPA',
      role: 'accountant',
      is_primary: true,
      is_active: true,
      email: 'linda@chencpa.example.com',
      phone: '617-555-0301',
      preferred_contact: 'email',
      hourly_rate: 275,
      specialty: 'Rental property tax strategy, Schedule E specialist',
      notes: `${DEMO_TAG} Files my returns every March, knows the duplex inside and out.`,
    },
    {
      owner_id: user.id,
      full_name: 'Joe Martinez',
      company_name: "Joe's Plumbing",
      role: 'plumber',
      is_primary: true,
      is_active: true,
      email: 'joe@joesplumbing.example.com',
      phone: '617-555-0312',
      alt_phone: '617-555-0313',
      preferred_contact: 'phone',
      hourly_rate: 165,
      rate_notes: '$150 minimum charge, $165/hr after',
      specialty: 'Emergency 24/7, Somerville + Cambridge coverage',
      available_24_7: true,
      notes: `${DEMO_TAG} Has saved me twice at 2am. Always pick up the phone.`,
    },
    {
      owner_id: user.id,
      full_name: 'Maria Sanchez',
      company_name: null,
      role: 'electrician',
      is_primary: true,
      is_active: true,
      phone: '617-555-0324',
      preferred_contact: 'text',
      hourly_rate: 145,
      license_number: 'MA-ELEC-48291',
      license_state: 'MA',
      specialty: 'Old-house rewiring, panel upgrades, knob-and-tube replacement',
      notes: `${DEMO_TAG} Licensed master electrician, reliable and fast.`,
    },
    {
      owner_id: user.id,
      full_name: 'Robert Kessler',
      company_name: 'Kessler Law Group',
      role: 'lawyer',
      is_primary: true,
      is_active: true,
      email: 'bob@kesslerlaw.example.com',
      phone: '617-555-0335',
      preferred_contact: 'email',
      license_number: 'MA-BAR-62814',
      license_state: 'MA',
      hourly_rate: 425,
      specialty: 'MA landlord-tenant law, eviction specialist, lease review',
      notes: `${DEMO_TAG} Retainer $2500/yr, handles evictions start to finish.`,
    },
    {
      owner_id: user.id,
      full_name: 'Karen Wu',
      company_name: 'State Farm — Wu Agency',
      role: 'insurance_agent',
      is_primary: true,
      is_active: true,
      email: 'karen.wu@statefarm.example.com',
      phone: '617-555-0346',
      preferred_contact: 'email',
      specialty: 'Landlord policies, umbrella coverage, loss of rent riders',
      notes: `${DEMO_TAG} Bundled my 2 properties, saved ~$600/yr vs previous agent.`,
    },
    {
      owner_id: user.id,
      full_name: 'Tony Bianchi',
      company_name: '24hr Boston Locksmith',
      role: 'locksmith',
      is_primary: true,
      is_active: true,
      phone: '617-555-0357',
      preferred_contact: 'phone',
      hourly_rate: 125,
      specialty: 'Lockouts, rekey on turnover, smart lock installs',
      available_24_7: true,
      notes: `${DEMO_TAG} Called him twice for tenant lockouts. Fast and fair priced.`,
    },
  ])
  if (teamErr) {
    return {
      success: false,
      message: `Failed to seed team members: ${teamErr.message}`,
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/properties')
  revalidatePath('/dashboard/tenants')
  revalidatePath('/dashboard/maintenance')
  revalidatePath('/dashboard/prospects')
  revalidatePath('/dashboard/financials')
  revalidatePath('/dashboard/team')
  redirect('/dashboard/properties')
}

// Remove all rows tagged as demo data for the current user.
export async function unseedDemoData(): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  // Order matters because of FK restrictions: payments → leases →
  // tenants, maintenance/prospects → units → properties, expenses
  // standalone.
  const tagFilter = `${DEMO_TAG}%`

  await supabase.from('payments').delete().ilike('notes', tagFilter)
  await supabase.from('maintenance_requests').delete().ilike('notes', tagFilter)
  await supabase
    .from('prospects')
    .update({ deleted_at: new Date().toISOString() })
    .ilike('notes', tagFilter)
  await supabase.from('leases').delete().ilike('notes', tagFilter)
  await supabase
    .from('tenants')
    .update({ deleted_at: new Date().toISOString() })
    .ilike('notes', tagFilter)
  await supabase.from('expenses').delete().ilike('notes', tagFilter)
  await supabase
    .from('team_members')
    .update({ deleted_at: new Date().toISOString() })
    .ilike('notes', tagFilter)
  await supabase
    .from('units')
    .update({ deleted_at: new Date().toISOString() })
    .in(
      'property_id',
      (
        await supabase
          .from('properties')
          .select('id')
          .ilike('notes', tagFilter)
      ).data?.map((r) => r.id) ?? [],
    )
  await supabase
    .from('properties')
    .update({ deleted_at: new Date().toISOString() })
    .ilike('notes', tagFilter)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/properties')
  revalidatePath('/dashboard/tenants')
  revalidatePath('/dashboard/maintenance')
  revalidatePath('/dashboard/prospects')
  revalidatePath('/dashboard/financials')
  revalidatePath('/dashboard/team')
  redirect('/dashboard')
}

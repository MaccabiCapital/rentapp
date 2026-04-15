// ============================================================
// Team member (vendor directory) validation schemas
// ============================================================
//
// Mirrors public.team_members in db/schema.sql. "My Team" is
// the landlord's trusted contractor/vendor list: accountant,
// plumber, lawyer, insurance agent, etc.
//
// At least one of full_name or company_name is required — the
// DB has a check constraint, but we validate it here too so
// the user gets a friendly Zod error instead of a 500.

import * as z from 'zod'

export const TEAM_ROLE_VALUES = [
  'accountant',
  'maintenance',
  'locksmith',
  'plumber',
  'electrician',
  'hvac',
  'landscaper',
  'cleaning',
  'lawyer',
  'paralegal',
  'insurance_agent',
  'real_estate_agent',
  'inspector',
  'contractor',
  'sheriff_office',
  'property_manager',
  'other',
] as const

export type TeamRole = (typeof TEAM_ROLE_VALUES)[number]

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  accountant: 'Accountant',
  maintenance: 'Handyman / General',
  locksmith: 'Locksmith',
  plumber: 'Plumber',
  electrician: 'Electrician',
  hvac: 'HVAC',
  landscaper: 'Landscaper',
  cleaning: 'Cleaning',
  lawyer: 'Lawyer',
  paralegal: 'Paralegal',
  insurance_agent: 'Insurance Agent',
  real_estate_agent: 'Real Estate Agent',
  inspector: 'Inspector',
  contractor: 'General Contractor',
  sheriff_office: 'Sheriff Office',
  property_manager: 'Property Manager',
  other: 'Other',
}

// Role groups for the list page — grouped sections instead of
// one long table.
export const ROLE_GROUPS: Array<{ label: string; roles: TeamRole[] }> = [
  {
    label: 'Maintenance & repair',
    roles: [
      'maintenance',
      'plumber',
      'electrician',
      'hvac',
      'locksmith',
      'landscaper',
      'cleaning',
      'contractor',
      'inspector',
    ],
  },
  {
    label: 'Legal & evictions',
    roles: ['lawyer', 'paralegal', 'sheriff_office'],
  },
  {
    label: 'Financial & insurance',
    roles: ['accountant', 'insurance_agent'],
  },
  {
    label: 'Real estate',
    roles: ['real_estate_agent', 'property_manager'],
  },
  {
    label: 'Other',
    roles: ['other'],
  },
]

export const PREFERRED_CONTACT_VALUES = [
  'email',
  'phone',
  'text',
] as const
export type PreferredContact = (typeof PREFERRED_CONTACT_VALUES)[number]
export const PREFERRED_CONTACT_LABELS: Record<PreferredContact, string> = {
  email: 'Email',
  phone: 'Phone',
  text: 'Text',
}

// Maps team roles to the expense category that best fits when
// auto-suggesting on the expense form.
export const ROLE_TO_EXPENSE_CATEGORY: Partial<
  Record<TeamRole, 'cleaning_maintenance' | 'legal_professional' | 'insurance' | 'repairs' | 'taxes' | 'management_fees' | 'other'>
> = {
  accountant: 'legal_professional',
  lawyer: 'legal_professional',
  paralegal: 'legal_professional',
  insurance_agent: 'insurance',
  maintenance: 'cleaning_maintenance',
  plumber: 'repairs',
  electrician: 'repairs',
  hvac: 'repairs',
  locksmith: 'repairs',
  landscaper: 'cleaning_maintenance',
  cleaning: 'cleaning_maintenance',
  contractor: 'repairs',
  inspector: 'repairs',
  property_manager: 'management_fees',
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))
  .refine(
    (v) => v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    { error: 'Please enter a valid email address.' },
  )

const optionalPositiveDecimal = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : Number(v)))
  .refine(
    (v) => v === undefined || (Number.isFinite(v) && v >= 0),
    { error: 'Must be a non-negative number.' },
  )

// Checkbox inputs arrive as 'on' or undefined
const checkboxBool = z
  .string()
  .optional()
  .transform((v) => v === 'on' || v === 'true')

// ------------------------------------------------------------
// Schemas
// ------------------------------------------------------------

const baseFields = {
  full_name: optionalText,
  company_name: optionalText,
  role: z.enum(TEAM_ROLE_VALUES, { error: 'Pick a valid role.' }),
  is_primary: checkboxBool,
  is_active: checkboxBool,
  email: optionalEmail,
  phone: optionalText,
  alt_phone: optionalText,
  preferred_contact: z
    .enum(PREFERRED_CONTACT_VALUES, {
      error: 'Pick a valid contact preference.',
    })
    .default('phone'),
  license_number: optionalText,
  license_state: optionalText,
  hourly_rate: optionalPositiveDecimal,
  rate_notes: optionalText,
  specialty: optionalText,
  available_24_7: checkboxBool,
  notes: optionalText,
}

export const TeamMemberCreateSchema = z
  .object(baseFields)
  .refine(
    (v) => (v.full_name ?? '').length > 0 || (v.company_name ?? '').length > 0,
    {
      error: 'Provide a person name OR a company name (or both).',
      path: ['full_name'],
    },
  )

export const TeamMemberUpdateSchema = TeamMemberCreateSchema

export type TeamMemberCreateInput = z.infer<typeof TeamMemberCreateSchema>
export type TeamMemberUpdateInput = z.infer<typeof TeamMemberUpdateSchema>

export type TeamMember = {
  id: string
  owner_id: string
  full_name: string | null
  company_name: string | null
  role: TeamRole
  is_primary: boolean
  is_active: boolean
  email: string | null
  phone: string | null
  alt_phone: string | null
  preferred_contact: PreferredContact
  license_number: string | null
  license_state: string | null
  hourly_rate: number | null
  rate_notes: string | null
  specialty: string | null
  available_24_7: boolean
  last_used_on: string | null
  total_jobs_ytd: number
  total_spend_ytd: number
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// Display helper — the list and picker need to render a
// person's name consistently whether they're a solo operator
// (full_name) or a company (company_name) or both.
export function displayTeamName(
  member: Pick<TeamMember, 'full_name' | 'company_name'>,
): string {
  const person = member.full_name?.trim()
  const company = member.company_name?.trim()
  if (person && company) return `${person} (${company})`
  if (person) return person
  if (company) return company
  return 'Unnamed'
}

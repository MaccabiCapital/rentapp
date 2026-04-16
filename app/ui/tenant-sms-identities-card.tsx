// ============================================================
// Tenant SMS identities card — server component
// ============================================================
//
// Shows phone numbers linked to a tenant + an inline form to add
// a new one. Linking a number means "when an SMS from this number
// hits the support webhook, auto-resolve it to this tenant."

import { getSmsIdentitiesForTenant } from '@/app/lib/queries/sms-identities'
import { formatPhoneForDisplay } from '@/app/lib/phone'
import { LinkPhoneForm } from '@/app/ui/link-phone-form'
import { UnlinkPhoneButton } from '@/app/ui/unlink-phone-button'

export async function TenantSmsIdentitiesCard({
  tenantId,
}: {
  tenantId: string
}) {
  const identities = await getSmsIdentitiesForTenant(tenantId)

  return (
    <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            SMS routing
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Phone numbers that should auto-route to this tenant when they
            text your support line.
          </p>
        </div>
      </div>

      {identities.length === 0 ? (
        <p className="text-sm text-zinc-600">No phone numbers linked yet.</p>
      ) : (
        <ul className="mb-4 divide-y divide-zinc-100 rounded-md border border-zinc-200">
          {identities.map((id) => (
            <li
              key={id.id}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium text-zinc-900">
                  {formatPhoneForDisplay(id.phone_number)}
                </div>
                <div className="text-xs text-zinc-500">
                  {id.verification_method === 'manual'
                    ? 'Added manually'
                    : id.verification_method === 'triage_assign'
                      ? 'Assigned from inbox'
                      : (id.verification_method ?? 'Linked')}
                </div>
              </div>
              <UnlinkPhoneButton identityId={id.id} />
            </li>
          ))}
        </ul>
      )}

      <LinkPhoneForm tenantId={tenantId} />
    </section>
  )
}

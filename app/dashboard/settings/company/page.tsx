// ============================================================
// Dashboard → Settings → Company
// ============================================================
//
// Branding + business contact + default policies. Logo upload is
// a separate small form so it doesn't gate the rest of the save.
// Brand color and logo will be used by future PDF + dashboard
// theme work; today the criteria PDF reads company name + address.

import Link from 'next/link'
import { getMyCompanyProfile } from '@/app/lib/queries/company-profile'
import { getSignedLogoUrl } from '@/app/lib/storage/landlord-branding'
import { CompanyProfileForm } from '@/app/ui/company-profile-form'
import { CompanyLogoUploader } from '@/app/ui/company-logo-uploader'

export default async function CompanySettingsPage() {
  const profile = await getMyCompanyProfile()
  const logoUrl = profile?.logo_storage_path
    ? await getSignedLogoUrl(profile.logo_storage_path)
    : null

  return (
    <div>
      <div className="mb-4 text-sm text-zinc-600">
        <Link href="/dashboard/settings" className="hover:text-zinc-900">
          Settings
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">Company</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Company</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Your business identity + default policies. The company name and
          mailing address appear on every generated document (notices,
          settlements, criteria PDFs, applications). The default policies
          pre-fill new leases and rent schedules.
        </p>
      </div>

      <div className="mb-6">
        <CompanyLogoUploader
          existingUrl={logoUrl}
          hasLogo={!!profile?.logo_storage_path}
        />
      </div>

      <CompanyProfileForm existing={profile} />
    </div>
  )
}

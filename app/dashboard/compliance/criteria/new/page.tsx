import Link from 'next/link'
import { CriteriaForm } from '@/app/ui/criteria-form'

export default function NewCriteriaPage() {
  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard/compliance/criteria"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← All criteria
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Create tenant selection criteria
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Apply these criteria to every applicant equally. Publish to lock
          the version into a downloadable PDF.
        </p>
      </div>
      <CriteriaForm />
    </div>
  )
}

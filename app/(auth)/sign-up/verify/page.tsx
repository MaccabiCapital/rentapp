import Link from 'next/link'

export default function VerifyPage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-slate-700"
        >
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        Check your inbox
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        We sent a confirmation link to your email. Click it to finish creating
        your account. If you don&apos;t see it in a few minutes, check your
        spam folder.
      </p>
      <div className="mt-6">
        <Link
          href="/sign-in"
          className="text-sm font-medium text-slate-900 hover:underline"
        >
          ← Back to sign in
        </Link>
      </div>
    </div>
  )
}

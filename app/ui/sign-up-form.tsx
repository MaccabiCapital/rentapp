'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUp } from '@/app/actions/auth'
import type { AuthActionState } from '@/app/lib/definitions'

export function SignUpForm() {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    signUp,
    undefined,
  )

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Start a free account
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        No credit card. Cancel anytime.
      </p>

      <form action={action} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-slate-700"
          >
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          {state?.errors?.fullName && (
            <p className="mt-1 text-sm text-red-600">
              {state.errors.fullName[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          {state?.errors?.email && (
            <p className="mt-1 text-sm text-red-600">{state.errors.email[0]}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          {state?.errors?.password && (
            <ul className="mt-1 space-y-1 text-sm text-red-600">
              {state.errors.password.map((error) => (
                <li key={error}>• {error}</li>
              ))}
            </ul>
          )}
        </div>

        {state?.errors?._form && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {state.errors._form[0]}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link
          href="/sign-in"
          className="font-medium text-slate-900 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}

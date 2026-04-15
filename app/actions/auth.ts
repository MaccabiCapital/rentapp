'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import {
  SignUpSchema,
  SignInSchema,
  type AuthActionState,
} from '@/app/lib/definitions'

// ============================================================
// Sign up — creates an auth user + sends confirmation email
// ============================================================
export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = SignUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    return { errors: { _form: [error.message] } }
  }

  // Success — Supabase will send a confirmation email. Redirect to a
  // "check your inbox" page rather than straight to the dashboard.
  redirect('/sign-up/verify')
}

// ============================================================
// Sign in — password auth
// ============================================================
export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { errors: { _form: [error.message] } }
  }

  redirect('/dashboard')
}

// ============================================================
// Sign out
// ============================================================
export async function signOut() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/')
}

// ============================================================
// Zod schemas and shared types for forms + API boundaries
// ============================================================

import * as z from 'zod'

// ------------------------------------------------------------
// Auth forms
// ------------------------------------------------------------

export const SignUpSchema = z.object({
  email: z.email({ error: 'Please enter a valid email address.' }).trim(),
  password: z
    .string()
    .min(8, { error: 'Password must be at least 8 characters.' })
    .regex(/[a-zA-Z]/, { error: 'Must contain at least one letter.' })
    .regex(/[0-9]/, { error: 'Must contain at least one number.' }),
  fullName: z
    .string()
    .min(2, { error: 'Name must be at least 2 characters.' })
    .trim(),
})

export const SignInSchema = z.object({
  email: z.email({ error: 'Please enter a valid email address.' }).trim(),
  password: z.string().min(1, { error: 'Password is required.' }),
})

// ------------------------------------------------------------
// Action state shape — what server actions return to the form
// ------------------------------------------------------------

export type AuthActionState =
  | {
      errors?: {
        email?: string[]
        password?: string[]
        fullName?: string[]
        _form?: string[]
      }
      message?: string
    }
  | undefined

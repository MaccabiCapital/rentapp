// ============================================================
// Shared action-state type for server actions + useActionState
// ============================================================
//
// All Sprint 1+ CRUD server actions return this shape. The form
// consumes it via `useActionState<ActionState, FormData>(action, ...)`.
// Auth actions use the dedicated AuthActionState in definitions.ts
// to stay compatible with sprint 0 components.

export type ActionState =
  | { success: true }
  | { success: false; errors: Record<string, string[]> }
  | { success: false; message: string }

export const emptyActionState: ActionState = { success: true }

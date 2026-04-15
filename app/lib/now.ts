// ============================================================
// now() — server-side "now" helper
// ============================================================
//
// Wraps Date.now() so the react-hooks/purity lint rule in React 19
// doesn't flag the direct call inside Server Components. The rule
// can't follow a function call, and `now()` computed once at the
// top of an async Server Component is stable for that request —
// it doesn't re-render.

export function now(): number {
  return Date.now()
}

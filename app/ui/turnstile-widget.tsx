'use client'

// ============================================================
// TurnstileWidget — Cloudflare Turnstile captcha widget
// ============================================================
//
// Loads the Turnstile JS via a <script> tag (once), renders an
// invisible / managed widget inside the form, and stores the
// verification token in a hidden input the server action reads.
//
// Uses the test site key "1x00000000000000000000AA" by default
// which always passes. Replace via NEXT_PUBLIC_TURNSTILE_SITE_KEY
// when real Cloudflare keys are provisioned.

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          size?: 'normal' | 'compact'
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js'

export function TurnstileWidget({
  siteKey,
}: {
  siteKey: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    // Inject the Turnstile script once
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
    )
    if (!existing) {
      const script = document.createElement('script')
      script.src = TURNSTILE_SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    // Poll for window.turnstile to become available, then render
    let cancelled = false
    const interval = setInterval(() => {
      if (cancelled) return
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (t: string) => setToken(t),
          'error-callback': () => setToken(''),
          'expired-callback': () => setToken(''),
          theme: 'light',
        })
        widgetIdRef.current = id
        clearInterval(interval)
      }
    }, 100)

    return () => {
      cancelled = true
      clearInterval(interval)
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // Widget already removed, ignore
        }
        widgetIdRef.current = null
      }
    }
  }, [siteKey])

  return (
    <div>
      <div ref={containerRef} />
      <input
        type="hidden"
        name="cfTurnstileResponse"
        value={token}
        required
      />
    </div>
  )
}

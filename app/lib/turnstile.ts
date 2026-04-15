// ============================================================
// Cloudflare Turnstile server-side verification
// ============================================================
//
// The public inquiry form on /listings/[slug] sends the user's
// Turnstile response token along with their form data. The
// server action calls this helper to verify the token with
// Cloudflare before trusting the submission.
//
// Uses the Turnstile siteverify endpoint:
//   https://challenges.cloudflare.com/turnstile/v0/siteverify

export async function verifyTurnstile(
  token: string,
  remoteIp?: string,
): Promise<{ ok: boolean; errorCodes: string[] }> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    // If the secret isn't configured, we FAIL CLOSED — reject
    // all submissions. Better than silently allowing spam.
    return {
      ok: false,
      errorCodes: ['turnstile-not-configured'],
    }
  }

  const formData = new URLSearchParams()
  formData.append('secret', secret)
  formData.append('response', token)
  if (remoteIp) formData.append('remoteip', remoteIp)

  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: formData,
      },
    )
    if (!res.ok) {
      return { ok: false, errorCodes: [`http-${res.status}`] }
    }
    const json = (await res.json()) as {
      success: boolean
      'error-codes'?: string[]
    }
    return {
      ok: json.success === true,
      errorCodes: json['error-codes'] ?? [],
    }
  } catch (err) {
    return {
      ok: false,
      errorCodes: [
        err instanceof Error ? `fetch-failed: ${err.message}` : 'fetch-failed',
      ],
    }
  }
}

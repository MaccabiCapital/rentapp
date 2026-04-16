'use client'

// ============================================================
// ContactActions — call / email / text / copy for a team member
// ============================================================
//
// Uses native tel: / mailto: / sms: URIs so the platform picks
// the right app. The copy button copies a compact text snippet
// with name + phone + email so the landlord can paste it into
// a text message or an intake form.

import { useState, useTransition } from 'react'
import type { TeamMember } from '@/app/lib/schemas/team'
import { displayTeamName } from '@/app/lib/schemas/team'
import { logCommunication } from '@/app/actions/communications'
import type { CommChannel, CommEntityType } from '@/app/lib/schemas/communications'

type ContactActionsProps = {
  member: Pick<
    TeamMember,
    'full_name' | 'company_name' | 'phone' | 'alt_phone' | 'email'
  >
  emailSubject?: string
  emailBody?: string
  size?: 'sm' | 'md'
  // Pass these to enable the quick-log pill: every Call / Text / Email
  // click auto-logs an outbound communication against this entity.
  logEntityType?: CommEntityType
  logEntityId?: string
}

export function ContactActions({
  member,
  emailSubject,
  emailBody,
  size = 'md',
  logEntityType,
  logEntityId,
}: ContactActionsProps) {
  const [copied, setCopied] = useState(false)
  const [, startTransition] = useTransition()
  const [logged, setLogged] = useState<string | null>(null)

  const name = displayTeamName(member)
  const phoneDigits = member.phone?.replace(/\D/g, '') ?? ''
  const altDigits = member.alt_phone?.replace(/\D/g, '') ?? ''

  function quickLog(channel: CommChannel, content: string) {
    if (!logEntityType || !logEntityId) return
    const fd = new FormData()
    fd.set('entity_type', logEntityType)
    fd.set('entity_id', logEntityId)
    fd.set('direction', 'outbound')
    fd.set('channel', channel)
    fd.set('content', content)
    startTransition(async () => {
      const res = await logCommunication({ success: true }, fd)
      if (res && 'success' in res && res.success) {
        setLogged(channel)
        setTimeout(() => setLogged(null), 1500)
      }
    })
  }

  const mailtoHref = member.email
    ? `mailto:${member.email}${
        emailSubject
          ? `?subject=${encodeURIComponent(emailSubject)}${
              emailBody ? `&body=${encodeURIComponent(emailBody)}` : ''
            }`
          : emailBody
            ? `?body=${encodeURIComponent(emailBody)}`
            : ''
      }`
    : null

  async function handleCopy() {
    const lines = [name]
    if (member.phone) lines.push(member.phone)
    if (member.alt_phone) lines.push(`alt: ${member.alt_phone}`)
    if (member.email) lines.push(member.email)
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const baseClass =
    size === 'sm'
      ? 'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium'
      : 'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium'

  return (
    <div className="flex flex-wrap gap-2">
      {phoneDigits && (
        <a
          href={`tel:${phoneDigits}`}
          onClick={() => quickLog('call', `Called ${name}`)}
          className={`${baseClass} bg-indigo-600 text-white hover:bg-indigo-700`}
        >
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
          Call
        </a>
      )}
      {altDigits && altDigits !== phoneDigits && (
        <a
          href={`tel:${altDigits}`}
          onClick={() => quickLog('call', `Called ${name} (alt number)`)}
          className={`${baseClass} border border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50`}
        >
          Call alt
        </a>
      )}
      {phoneDigits && (
        <a
          href={`sms:${phoneDigits}${emailBody ? `?body=${encodeURIComponent(emailBody)}` : ''}`}
          onClick={() =>
            quickLog('sms', emailBody ? `Texted ${name}: ${emailBody}` : `Texted ${name}`)
          }
          className={`${baseClass} border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50`}
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Text
        </a>
      )}
      {mailtoHref && (
        <a
          href={mailtoHref}
          onClick={() =>
            quickLog(
              'email',
              emailSubject
                ? `Emailed ${name}: ${emailSubject}`
                : `Emailed ${name}`,
            )
          }
          className={`${baseClass} border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50`}
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Email
        </a>
      )}
      <button
        type="button"
        onClick={handleCopy}
        className={`${baseClass} border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50`}
      >
        {copied ? 'Copied!' : 'Copy contact'}
      </button>
      {logEntityType && logged && (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
          {logged} logged
        </span>
      )}
    </div>
  )
}

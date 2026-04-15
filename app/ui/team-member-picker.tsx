'use client'

// ============================================================
// TeamMemberPicker — typeahead datalist for picking a team member
// ============================================================
//
// Designed to replace free-text "assigned_to" / "vendor" fields.
// Native <datalist> means no dropdown JS — the browser handles
// typeahead. When the user types something that exactly matches
// an option, the hidden member_id field gets populated; otherwise
// the free-text value is passed through as vendor/assigned_to
// and the member_id is empty.
//
// The server action reads BOTH fields: if member_id is set, it
// uses that for touching usage counters and gets the display
// name from the DB. If only the free-text field is set, it just
// writes the text.

import { useMemo, useState } from 'react'
import type { TeamPickerOption } from '@/app/lib/queries/team'
import { TEAM_ROLE_LABELS } from '@/app/lib/schemas/team'

type TeamMemberPickerProps = {
  options: TeamPickerOption[]
  /** Name of the free-text field (e.g. "assigned_to" or "vendor") */
  textFieldName: string
  /** Name of the hidden member id field (e.g. "team_member_id") */
  idFieldName: string
  label: string
  placeholder?: string
  defaultValue?: string
  defaultMemberId?: string | null
  helpText?: string
}

export function TeamMemberPicker({
  options,
  textFieldName,
  idFieldName,
  label,
  placeholder,
  defaultValue = '',
  helpText,
}: TeamMemberPickerProps) {
  const [textValue, setTextValue] = useState(defaultValue)

  // Build an index from display string to member id so we can
  // resolve typeahead selections to member ids.
  const nameToId = useMemo(() => {
    const map = new Map<string, string>()
    for (const opt of options) {
      map.set(opt.display_name, opt.id)
      // Also allow matching "Display Name — Role" which is what
      // the datalist shows as the label.
      map.set(`${opt.display_name} — ${TEAM_ROLE_LABELS[opt.role]}`, opt.id)
    }
    return map
  }, [options])

  // Derive member id from current text value — no useEffect, no
  // cascading render. React 19's react-hooks/set-state-in-effect
  // lint rule forbids setState inside useEffect when the value
  // is fully derivable, which it is here.
  const memberId = nameToId.get(textValue.trim()) ?? ''

  const listId = `${textFieldName}-list`

  return (
    <div>
      <label
        htmlFor={textFieldName}
        className="block text-sm font-medium text-zinc-900"
      >
        {label}
      </label>
      <input
        id={textFieldName}
        name={textFieldName}
        type="text"
        list={listId}
        placeholder={placeholder}
        value={textValue}
        onChange={(e) => setTextValue(e.target.value)}
        className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <input type="hidden" name={idFieldName} value={memberId} />
      <datalist id={listId}>
        {options.map((opt) => {
          const label = `${opt.display_name} — ${TEAM_ROLE_LABELS[opt.role]}`
          return (
            <option key={opt.id} value={label}>
              {opt.specialty ?? ''}
            </option>
          )
        })}
      </datalist>
      {helpText && <p className="mt-1 text-xs text-zinc-500">{helpText}</p>}
      {memberId && (
        <p className="mt-1 text-xs text-emerald-700">
          ✓ linked to team member
        </p>
      )}
    </div>
  )
}

'use client'

import { useActionState, useRef, useEffect } from 'react'
import type { ActionState } from '@/app/lib/types'
import {
  COMM_CHANNEL_LABELS,
  COMM_CHANNEL_VALUES,
  COMM_DIRECTION_LABELS,
  COMM_DIRECTION_VALUES,
  type CommChannel,
  type CommDirection,
  type CommEntityType,
} from '@/app/lib/schemas/communications'

type LogCommunicationFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  entityType: CommEntityType
  entityId: string
  defaultChannel?: CommChannel
  defaultDirection?: CommDirection
}

export function LogCommunicationForm({
  action,
  entityType,
  entityId,
  defaultChannel = 'call',
  defaultDirection = 'outbound',
}: LogCommunicationFormProps) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    action,
    { success: true },
  )

  const formRef = useRef<HTMLFormElement>(null)

  // Clear the content field after a successful submission so the
  // landlord can log the next interaction without manually wiping.
  useEffect(() => {
    if (state && 'success' in state && state.success && formRef.current) {
      const ta = formRef.current.querySelector<HTMLTextAreaElement>(
        'textarea[name="content"]',
      )
      if (ta) ta.value = ''
    }
  }, [state])

  const errors = state && !state.success && 'errors' in state ? state.errors : {}
  const formMessage =
    state && !state.success && 'message' in state ? state.message : null

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="entity_type" value={entityType} />
      <input type="hidden" name="entity_id" value={entityId} />

      {formMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          {formMessage}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="direction"
            className="block text-xs font-medium text-zinc-700"
          >
            Direction
          </label>
          <select
            id="direction"
            name="direction"
            defaultValue={defaultDirection}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {COMM_DIRECTION_VALUES.map((d) => (
              <option key={d} value={d}>
                {COMM_DIRECTION_LABELS[d]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="channel"
            className="block text-xs font-medium text-zinc-700"
          >
            Channel
          </label>
          <select
            id="channel"
            name="channel"
            defaultValue={defaultChannel}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {COMM_CHANNEL_VALUES.map((c) => (
              <option key={c} value={c}>
                {COMM_CHANNEL_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="content"
          className="block text-xs font-medium text-zinc-700"
        >
          What happened?
        </label>
        <textarea
          id="content"
          name="content"
          rows={3}
          required
          placeholder="e.g. Called about rent — will pay by Friday."
          className="mt-1 block w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {errors.content && (
          <p className="mt-1 text-xs text-red-600">
            {errors.content.join(' ')}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Logging…' : 'Log entry'}
        </button>
      </div>
    </form>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { deleteProspectDocument } from '@/app/actions/screening'

export function ProspectDocumentDeleteButton({
  documentId,
}: {
  documentId: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm('Delete this document?')) return
          setError(null)
          startTransition(async () => {
            const result = await deleteProspectDocument(documentId)
            if (result.success === false && 'message' in result) {
              setError(result.message ?? 'Delete failed.')
            }
          })
        }}
        className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
      >
        {isPending ? 'Deleting…' : 'Delete'}
      </button>
      {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}

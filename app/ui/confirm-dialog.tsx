'use client'

// ============================================================
// ConfirmDialog — reusable modal for destructive actions
// ============================================================
//
// Uses the native <dialog> element — no external UI library
// dependency. Wraps an arbitrary trigger element and calls
// onConfirm when the destructive button is clicked. Keep this
// simple: focus trap is handled natively by showModal().

import { useRef, type ReactNode } from 'react'

type ConfirmDialogProps = {
  trigger: ReactNode
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Delete',
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  function open() {
    dialogRef.current?.showModal()
  }

  function close() {
    dialogRef.current?.close()
  }

  function handleConfirm() {
    close()
    onConfirm()
  }

  return (
    <>
      <span onClick={open}>{trigger}</span>
      <dialog
        ref={dialogRef}
        className="rounded-lg p-0 shadow-2xl backdrop:bg-black/40 max-w-md"
        onClick={(e) => {
          // Click on the backdrop (dialog element itself, not its content)
          // closes the dialog.
          if (e.target === dialogRef.current) close()
        }}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          <p className="mt-2 text-sm text-zinc-600">{description}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={close}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}

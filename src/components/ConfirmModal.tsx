import { useEffect, useRef } from 'react'

interface SignOutConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

/**
 * Native `<dialog>` modal: focus trap + Esc via showModal(), light-dismiss
 * via backdrop click. `closedby="any"` is progressive enhancement where supported.
 */
export function SignOutConfirmModal({
  open,
  onClose,
  onConfirm,
}: SignOutConfirmModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const openRef = useRef(open)
  openRef.current = open

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.setAttribute('closedby', 'any')
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      if (!dialog.open) dialog.showModal()
      cancelRef.current?.focus()
      return
    }

    if (dialog.open) dialog.close()
    const previous = previousFocusRef.current
    previousFocusRef.current = null
    previous?.focus()
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const syncClosed = () => {
      if (openRef.current) onClose()
    }

    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target !== dialog) return
      const rect = dialog.getBoundingClientRect()
      const inside =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      if (!inside) dialog.close()
    }

    dialog.addEventListener('close', syncClosed)
    dialog.addEventListener('click', handleBackdropClick)
    return () => {
      dialog.removeEventListener('close', syncClosed)
      dialog.removeEventListener('click', handleBackdropClick)
    }
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      className="pd-modal"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <h3 id="confirm-modal-title" className="pd-modal__title">
        Sign out?
      </h3>
      <p id="confirm-modal-desc" className="pd-modal__message">
        Are you sure you want to sign out?
      </p>
      <div className="pd-modal__actions">
        <button
          ref={cancelRef}
          type="button"
          className="pd-btn pd-btn-secondary"
          onClick={() => dialogRef.current?.close()}
        >
          Cancel
        </button>
        <button
          type="button"
          className="pd-btn pd-btn-danger"
          onClick={onConfirm}
        >
          Sign out
        </button>
      </div>
    </dialog>
  )
}

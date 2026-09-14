import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Button, type ButtonVariant } from './Button'
import { Input } from './Input'
import { Modal } from './Modal'

export type ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Confirm button style. Use danger for destructive actions. */
  confirmVariant?: Extract<ButtonVariant, 'primary' | 'danger'>
  /**
   * When set, the confirm action stays disabled until the user types this
   * exact text (case-sensitive).
   */
  requireText?: string
  /** Label for the type-to-confirm field. */
  requireTextLabel?: string
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  requireText,
  requireTextLabel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const inputId = useId()
  const [typed, setTyped] = useState('')
  const canConfirm = !requireText || typed === requireText

  useEffect(() => {
    if (!open) {
      setTyped('')
      return
    }
    if (!requireText) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(inputId)?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, requireText, inputId])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      initialFocusRef={requireText ? undefined : cancelRef}
      actions={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            disabled={!canConfirm}
            onClick={() => {
              if (!canConfirm) return
              onConfirm()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {requireText ? (
        <Input
          id={inputId}
          label={requireTextLabel ?? `Type ${requireText} to confirm`}
          value={typed}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && canConfirm) {
              event.preventDefault()
              onConfirm()
            }
          }}
        />
      ) : null}
    </Modal>
  )
}

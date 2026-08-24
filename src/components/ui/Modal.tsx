import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type HTMLAttributes,
} from 'react'
import { CircleHelp } from 'lucide-react'
import { cx } from '@/lib/cx'
import { Tooltip } from './Tooltip'

export type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  /** Question-mark hint beside the title. Prefer this over a body explanation. */
  titleHint?: string
  titleHintLabel?: string
  children?: ReactNode
  /** Footer actions (buttons). */
  actions?: ReactNode
  className?: string
  /** Element that receives focus when the modal opens. Defaults to the dialog. */
  initialFocusRef?: React.RefObject<HTMLElement | null>
}

/**
 * Native `<dialog>` modal: focus trap + Esc via showModal(), light-dismiss
 * via backdrop click. `closedby="any"` is progressive enhancement where supported.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  titleHint,
  titleHintLabel = 'More information',
  children,
  actions,
  className,
  initialFocusRef,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const openRef = useRef(open)
  openRef.current = open
  const titleId = useId()
  const descriptionId = useId()

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
      const focusTarget = initialFocusRef?.current ?? dialog
      focusTarget.focus()
      return
    }

    if (dialog.open) dialog.close()
    const previous = previousFocusRef.current
    previousFocusRef.current = null
    previous?.focus()
  }, [open, initialFocusRef])

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
      className={cx('pd-modal', className)}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <span className="pd-modal__title-row">
        <h3 id={titleId} className="pd-modal__title">
          {title}
        </h3>
        {titleHint ? (
          <Tooltip content={titleHint} side="top" portal delayMs={80}>
            <button
              type="button"
              className="pd-help-icon"
              aria-label={titleHintLabel}
            >
              <CircleHelp size={16} strokeWidth={2} aria-hidden />
            </button>
          </Tooltip>
        ) : null}
      </span>
      {description ? (
        <p id={descriptionId} className="pd-modal__message">
          {description}
        </p>
      ) : null}
      {children ? <div className="pd-modal__body">{children}</div> : null}
      {actions ? <div className="pd-modal__actions">{actions}</div> : null}
    </dialog>
  )
}

export function ModalActions({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('pd-modal__actions', className)} {...props} />
}

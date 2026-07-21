interface SignOutConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function SignOutConfirmModal({
  open,
  onClose,
  onConfirm,
}: SignOutConfirmModalProps) {
  if (!open) return null

  return (
    <>
      <div
        role="presentation"
        className="pd-modal-backdrop"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        className="pd-modal"
      >
        <h3 id="confirm-modal-title" className="pd-modal__title">
          Sign out?
        </h3>
        <p id="confirm-modal-desc" className="pd-modal__message">
          Are you sure you want to sign out?
        </p>
        <div className="pd-modal__actions">
          <button
            type="button"
            className="pd-btn pd-btn-secondary"
            onClick={onClose}
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
      </div>
    </>
  )
}

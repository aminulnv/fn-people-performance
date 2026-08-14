import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui'

type EditPageShellProps = {
  title: string
  description?: string
  onBack: () => void
  onSave: () => void
  saving?: boolean
  error?: string | null
  children: ReactNode
}

export function EditPageShell({
  title,
  description,
  onBack,
  onSave,
  saving = false,
  error,
  children,
}: EditPageShellProps) {
  return (
    <div className="pd-reviews-edit">
      <header className="pd-reviews-edit__header">
        <div className="pd-reviews-edit__heading">
          <button
            type="button"
            className="pd-reviews-edit__back"
            onClick={onBack}
            aria-label="Back to cycle settings"
          >
            <ChevronLeft size={20} strokeWidth={2} aria-hidden />
          </button>
          <div className="pd-reviews-edit__titles">
            <h2 className="pd-reviews-edit__title">{title}</h2>
            {description ? (
              <p className="pd-reviews-edit__description">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="pd-reviews-edit__actions">
          <Button variant="secondary" pill onClick={onBack}>
            Cancel
          </Button>
          <Button variant="primary" pill onClick={onSave} loading={saving}>
            Save
          </Button>
        </div>
      </header>

      {error ? (
        <p className="pd-reviews-modal__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="pd-reviews-edit__body">{children}</div>
    </div>
  )
}

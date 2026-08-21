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
  /** Settings sit under a parent header and segment bar. */
  embedded?: boolean
  /** Where Save / Cancel sit. Cycle details uses below the form. */
  actionsPlacement?: 'top' | 'bottom'
  children: ReactNode
}

export function EditPageShell({
  title,
  description,
  onBack,
  onSave,
  saving = false,
  error,
  embedded = false,
  actionsPlacement = 'top',
  children,
}: EditPageShellProps) {
  const actions = (
    <div className="pd-reviews-edit__actions">
      {embedded ? null : (
        <Button variant="secondary" pill onClick={onBack}>
          Cancel
        </Button>
      )}
      <Button variant="primary" pill onClick={onSave} loading={saving}>
        Save
      </Button>
    </div>
  )
  const showHeading = !embedded
  const showTopActions = actionsPlacement === 'top'
  const showHeader = showHeading || showTopActions

  return (
    <div className={embedded ? 'pd-reviews-edit pd-reviews-edit--embedded' : 'pd-reviews-edit'}>
      {showHeader ? (
        <header className={embedded ? 'pd-reviews-edit__toolbar' : 'pd-reviews-edit__header'}>
          {showHeading ? (
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
          ) : null}
          {showTopActions ? actions : null}
        </header>
      ) : null}

      {error ? (
        <p className="pd-reviews-modal__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="pd-reviews-edit__body">{children}</div>
      {actionsPlacement === 'bottom' ? (
        <div className="pd-reviews-edit__footer">{actions}</div>
      ) : null}
    </div>
  )
}

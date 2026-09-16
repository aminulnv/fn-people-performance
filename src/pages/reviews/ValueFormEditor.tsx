import { useId, useState } from 'react'
import { Button, Switch } from '@/components/ui'
import {
  createCompanyValue,
  updateCompanyValue,
} from '@/lib/values/store'
import type { CompanyValue, ValueStatus } from '@/lib/values/types'

export function ValueFormFields({
  mode,
  existing,
  onSaved,
  onCancel,
}: {
  mode: 'create' | 'edit'
  existing?: CompanyValue | null
  onSaved: (value: CompanyValue) => void
  onCancel: () => void
}) {
  const titleId = useId()
  const descriptionId = useId()
  const [enabled, setEnabled] = useState(
    mode === 'edit' ? existing?.status !== 'disabled' : true,
  )
  const [title, setTitle] = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (mode === 'edit' && !existing) {
    return (
      <div className="pd-reviews-value-panel__empty">
        <p className="pd-reviews-flow__hint">This value was not found.</p>
        <Button variant="secondary" pill onClick={onCancel}>
          Back to values
        </Button>
      </div>
    )
  }

  const submit = () => {
    if (saving) return
    setSaving(true)
    setError(null)
    const status: ValueStatus = enabled ? 'enabled' : 'disabled'
    const payload = {
      name: title,
      description,
      status,
      behaviours: [],
    }
    const save =
      mode === 'edit' && existing
        ? updateCompanyValue(existing.id, payload)
        : createCompanyValue(payload)
    void save
      .then((saved) => {
        onSaved(saved)
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Could not save this value.',
        )
        setSaving(false)
      })
  }

  return (
    <form
      className="pd-reviews-value-panel__form"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <label className="pd-field" htmlFor={titleId}>
        <span className="pd-reviews-question__dual-label">Title</span>
        <input
          id={titleId}
          className="pd-reviews-scorecard__feedback-box pd-field__control pd-reviews-value-panel__title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Move Fast, Chase Excellence"
          required
          autoFocus
        />
      </label>
      <label className="pd-field" htmlFor={descriptionId}>
        <span className="pd-reviews-question__dual-label">Description</span>
        <textarea
          id={descriptionId}
          className="pd-reviews-scorecard__feedback-box pd-field__control pd-field__control--textarea"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What this value means day to day"
          rows={5}
        />
      </label>

      {error ? (
        <p className="pd-reviews-edit__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="pd-reviews-value-panel__actions">
        <Switch
          label="Enable"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <div className="pd-reviews-value-panel__actions-end">
          <Button type="button" variant="secondary" pill onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" pill loading={saving}>
            {mode === 'create' ? 'Create value' : 'Save changes'}
          </Button>
        </div>
      </div>
    </form>
  )
}

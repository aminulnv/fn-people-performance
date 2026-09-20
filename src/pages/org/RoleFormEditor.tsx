import { useId, useMemo, useState } from 'react'
import { Button, ListboxSelect } from '@/components/ui'
import { useOrganisationCatalogs } from '@/lib/employees/useEmployees'
import { createRole } from '@/lib/roles/store'
import type { PlatformRole } from '@/lib/roles/types'
import '@/styles/layout-reviews.css'

export function RoleFormFields({
  onSaved,
  onCancel,
}: {
  onSaved: (role: PlatformRole) => void
  onCancel: () => void
}) {
  const nameId = useId()
  const departmentFieldId = useId()
  const descriptionId = useId()
  const catalogs = useOrganisationCatalogs()
  const [name, setName] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const departmentOptions = useMemo(
    () =>
      catalogs.departments
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((department) => ({
          value: String(department.id),
          label: department.name,
        })),
    [catalogs.departments],
  )

  const submit = () => {
    if (saving) return
    setSaving(true)
    setError(null)
    void createRole({
      name,
      departmentId: departmentId ? Number(departmentId) : null,
      description,
    })
      .then((saved) => {
        onSaved(saved)
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Could not save this role.',
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
      <div className="pd-field">
        <label className="pd-reviews-question__dual-label" htmlFor={nameId}>
          Role name
        </label>
        <input
          id={nameId}
          className="pd-reviews-scorecard__feedback-box pd-field__control pd-reviews-value-panel__title"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. QA Engineer"
          required
          autoFocus
        />
      </div>

      <div className="pd-field">
        <label
          className="pd-reviews-question__dual-label"
          htmlFor={departmentFieldId}
        >
          Department
        </label>
        <ListboxSelect
          id={departmentFieldId}
          aria-label="Department"
          value={departmentId}
          onValueChange={setDepartmentId}
          placeholder="Select department"
          options={departmentOptions}
          searchable={departmentOptions.length > 8}
          searchPlaceholder="Search departments"
          noResultsText="No departments found"
        />
      </div>

      <div className="pd-field">
        <label
          className="pd-reviews-question__dual-label"
          htmlFor={descriptionId}
        >
          Description
        </label>
        <textarea
          id={descriptionId}
          className="pd-reviews-scorecard__feedback-box pd-field__control"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="A short summary of this role."
        />
        <p className="pd-field__hint">Optional.</p>
      </div>

      {error ? (
        <p className="pd-reviews-edit__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="pd-reviews-value-panel__actions">
        <div className="pd-reviews-value-panel__actions-end">
          <Button type="button" variant="secondary" pill onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" pill loading={saving}>
            Create role
          </Button>
        </div>
      </div>
    </form>
  )
}

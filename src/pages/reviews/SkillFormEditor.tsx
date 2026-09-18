import { useId, useMemo, useState } from 'react'
import { Button, ListboxSelect, Switch } from '@/components/ui'
import { useOrganisationCatalogs } from '@/lib/employees/useEmployees'
import { expectedLevelLabel } from '@/lib/roles/labels'
import { createSkill, updateSkill } from '@/lib/skills/store'
import {
  emptySkillMastery,
  SKILL_MASTERY_LEVELS,
  type Skill,
  type SkillMastery,
  type SkillStatus,
} from '@/lib/skills/types'

export function SkillFormFields({
  mode,
  existing,
  onSaved,
  onCancel,
}: {
  mode: 'create' | 'edit'
  existing?: Skill | null
  onSaved: (skill: Skill) => void
  onCancel: () => void
}) {
  const nameId = useId()
  const departmentId = useId()
  const catalogs = useOrganisationCatalogs()
  const [approved, setApproved] = useState(
    mode === 'edit' ? existing?.status !== 'draft' : true,
  )
  const [name, setName] = useState(existing?.name ?? '')
  const [department, setDepartment] = useState(existing?.department ?? '')
  const [mastery, setMastery] = useState<SkillMastery>(
    () => existing?.mastery ?? emptySkillMastery(),
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const departmentOptions = useMemo(() => {
    const byKey = new Map<string, string>()
    const add = (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed) return
      const key = trimmed.toLowerCase()
      if (!byKey.has(key)) byKey.set(key, trimmed)
    }
    for (const row of catalogs.departments) add(row.name)
    if (existing?.department) add(existing.department)
    return [...byKey.values()]
      .sort((left, right) => left.localeCompare(right))
      .map((label) => ({ value: label, label }))
  }, [catalogs.departments, existing?.department])

  if (mode === 'edit' && !existing) {
    return (
      <div className="pd-reviews-value-panel__empty">
        <p className="pd-reviews-flow__hint">This skill was not found.</p>
        <Button variant="secondary" pill onClick={onCancel}>
          Back to skills
        </Button>
      </div>
    )
  }

  const submit = () => {
    if (saving) return
    const trimmedDepartment = department.trim()
    if (
      trimmedDepartment &&
      !departmentOptions.some((option) => option.value === trimmedDepartment)
    ) {
      setError(
        'Pick a department from the list, or leave blank for company-wide.',
      )
      return
    }
    setSaving(true)
    setError(null)
    const status: SkillStatus = approved ? 'approved' : 'draft'
    const payload = {
      name,
      department: trimmedDepartment,
      role: '',
      status,
      mastery,
    }
    const save =
      mode === 'edit' && existing
        ? updateSkill(existing.id, payload)
        : createSkill(payload)
    void save
      .then((saved) => {
        onSaved(saved)
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Could not save this skill.',
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
          Skill name
        </label>
        <input
          id={nameId}
          className="pd-reviews-scorecard__feedback-box pd-field__control pd-reviews-value-panel__title"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Stakeholder Communication"
          required
          autoFocus
        />
      </div>
      <div className="pd-field">
        <label className="pd-reviews-question__dual-label" htmlFor={departmentId}>
          Department
        </label>
        <ListboxSelect
          id={departmentId}
          aria-label="Department"
          value={department}
          onValueChange={setDepartment}
          placeholder="Select department"
          emptyLabel="Company-wide"
          options={departmentOptions}
          searchable={departmentOptions.length > 8}
          searchPlaceholder="Search departments"
          noResultsText="No departments found"
        />
        <p className="pd-field__hint">
          Optional. Leave blank if this skill is company-wide.
        </p>
      </div>

      <section
        className="pd-reviews-value-panel__section pd-skill-mastery"
        aria-label="Skill mastery"
      >
        <h3 className="pd-reviews-value-panel__section-title">Skill mastery</h3>
        <p className="pd-field__hint">
          Define what each level of expertise looks like for this skill.
        </p>
        <div className="pd-skill-mastery__list">
          {SKILL_MASTERY_LEVELS.map((level) => {
            const fieldId = `${nameId}-mastery-${level}`
            return (
              <label key={level} className="pd-field pd-skill-mastery__item">
                <span className="pd-field__label">{expectedLevelLabel(level)}</span>
                <textarea
                  id={fieldId}
                  className="pd-field__control pd-reviews-scorecard__feedback-box"
                  rows={2}
                  value={mastery[level]}
                  onChange={(event) =>
                    setMastery((current) => ({
                      ...current,
                      [level]: event.target.value,
                    }))
                  }
                  placeholder={`What ${expectedLevelLabel(level).toLowerCase()} looks like…`}
                />
              </label>
            )
          })}
        </div>
      </section>

      {error ? (
        <p className="pd-reviews-edit__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="pd-reviews-value-panel__actions">
        <Switch
          label="Approved"
          checked={approved}
          onChange={(event) => setApproved(event.target.checked)}
        />
        <div className="pd-reviews-value-panel__actions-end">
          <Button type="button" variant="secondary" pill onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" pill loading={saving}>
            {mode === 'create' ? 'Create skill' : 'Save changes'}
          </Button>
        </div>
      </div>
    </form>
  )
}

import { useEffect, useId, useState } from 'react'
import { Button, Switch } from '@/components/ui'
import { expectedLevelLabel } from '@/lib/roles/labels'
import { archiveSkill, createSkill, updateSkill } from '@/lib/skills/store'
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
  onArchived,
}: {
  mode: 'create' | 'edit'
  existing?: Skill | null
  onSaved: (skill: Skill) => void
  onCancel: () => void
  onArchived?: () => void
}) {
  const nameId = useId()
  const [active, setActive] = useState(
    mode === 'edit' ? existing?.status !== 'inactive' : true,
  )
  const [name, setName] = useState(existing?.name ?? '')
  const [mastery, setMastery] = useState<SkillMastery>(
    () => existing?.mastery ?? emptySkillMastery(),
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const existingMasteryKey = existing
    ? SKILL_MASTERY_LEVELS.map((level) => existing.mastery[level] ?? '').join('\0')
    : ''

  // Keep fields in sync when store fills seed rubrics after first paint.
  useEffect(() => {
    if (mode !== 'edit' || !existing) return
    setActive(existing.status !== 'inactive')
    setName(existing.name)
    setMastery(existing.mastery ?? emptySkillMastery())
    // Content keys only — not `existing` identity — so typing isn’t reset.
  }, [mode, existing?.id, existing?.name, existing?.status, existingMasteryKey])

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
    setSaving(true)
    setError(null)
    const status: SkillStatus = active ? 'active' : 'inactive'
    const payload = {
      name,
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
          label="Active"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />
        <div className="pd-reviews-value-panel__actions-end">
          {mode === 'edit' && existing && onArchived ? (
            <Button
              type="button"
              variant="secondary"
              pill
              loading={archiving}
              disabled={saving}
              onClick={() => {
                if (archiving || saving) return
                setArchiving(true)
                setError(null)
                void archiveSkill(existing.id)
                  .then(() => {
                    onArchived()
                    onCancel()
                  })
                  .catch((err: unknown) => {
                    setError(
                      err instanceof Error
                        ? err.message
                        : 'Could not archive this skill.',
                    )
                    setArchiving(false)
                  })
              }}
            >
              Archive
            </Button>
          ) : null}
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

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Sparkles, X } from 'lucide-react'
import { Button, EmptyState, Modal } from '@/components/ui'
import { reviewsTabPath } from '@/lib/reviews/paths'
import {
  assignSkillToEmployee,
  getSkillIdsForEmployee,
  removeSkillFromEmployee,
} from '@/lib/skills/store'
import { useEmployeeSkills, useSkillsLibrary } from '@/lib/skills/useSkills'
import type { Skill } from '@/lib/skills/types'

export function ProfileSkillsCard({
  employeeId,
  canEdit,
}: {
  employeeId: number
  canEdit: boolean
}) {
  const library = useSkillsLibrary().skills
  const assigned = useEmployeeSkills(employeeId)
  const extraIds = useMemo(
    () => new Set(getSkillIdsForEmployee(employeeId)),
    [assigned, employeeId],
  )
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const assignedIds = useMemo(
    () => new Set(assigned.map((skill) => skill.id)),
    [assigned],
  )

  const available = useMemo(() => {
    const q = query.trim().toLowerCase()
    return library
      .filter((skill) => !assignedIds.has(skill.id))
      .filter((skill) => {
        if (!q) return true
        return [skill.name, skill.department]
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
  }, [assignedIds, library, query])

  return (
    <section className="pd-profile__card" aria-label="Skills">
      <header className="pd-profile__card-head">
        <h2 className="pd-profile__card-title">
          <Sparkles size={16} strokeWidth={1.75} aria-hidden />
          Skills
        </h2>
        {canEdit ? (
          <Button
            variant="secondary"
            size="sm"
            pill
            aria-label="Add skills"
            onClick={() => setOpen(true)}
          >
            <Plus size={14} strokeWidth={2} aria-hidden />
            Add
          </Button>
        ) : null}
      </header>

      {assigned.length === 0 ? (
        <EmptyState
          className="pd-empty--inline"
          title="No skills on this role yet"
          description={
            canEdit
              ? 'Role skills come from the competency matrix. You can still add extras from the library.'
              : 'Skills come from this person’s role. None are attached yet.'
          }
          action={
            canEdit ? (
              <Button variant="primary" size="sm" pill onClick={() => setOpen(true)}>
                Add extras
              </Button>
            ) : (
              <Link
                to={reviewsTabPath('skills')}
                className="pd-btn pd-btn--secondary pd-btn--sm pd-btn--pill"
              >
                Open skills library
              </Link>
            )
          }
        />
      ) : (
        <ul className="pd-profile__skill-list">
          {assigned.map((skill) => (
            <li key={skill.id} className="pd-profile__skill-chip">
              <span className="pd-profile__skill-chip-label">{skill.name}</span>
              {skill.expectedHint ? (
                <span className="pd-profile__skill-chip-meta">
                  {skill.expectedHint}
                </span>
              ) : skill.source === 'extra' ? (
                <span className="pd-profile__skill-chip-meta">Extra</span>
              ) : skill.department ? (
                <span className="pd-profile__skill-chip-meta">{skill.department}</span>
              ) : null}
              {canEdit && extraIds.has(skill.id) && skill.source === 'extra' ? (
                <button
                  type="button"
                  className="pd-profile__skill-chip-remove"
                  aria-label={`Remove ${skill.name}`}
                  onClick={() => {
                    void removeSkillFromEmployee(employeeId, skill.id)
                  }}
                >
                  <X size={14} strokeWidth={2} aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          setQuery('')
        }}
        title="Add extra skills"
        description="Role skills are inherited. These extras are graded on the review as well."
        actions={
          <Button
            variant="primary"
            pill
            onClick={() => {
              setOpen(false)
              setQuery('')
            }}
          >
            Done
          </Button>
        }
      >
        <label className="pd-field">
          <span className="pd-field__label">Search library</span>
          <input
            className="pd-field__control"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search skills…"
          />
        </label>
        {available.length === 0 ? (
          <p className="pd-reviews-flow__hint">
            {library.length === assigned.length
              ? 'Every library skill is already on this person.'
              : 'No skills match that search.'}{' '}
            <Link to={reviewsTabPath('skills')}>Manage library</Link>
          </p>
        ) : (
          <ul className="pd-profile__skill-picker" aria-label="Available skills">
            {available.map((skill) => (
              <SkillPickerRow
                key={skill.id}
                skill={skill}
                onAdd={() => {
                  void assignSkillToEmployee(employeeId, skill.id)
                }}
              />
            ))}
          </ul>
        )}
      </Modal>
    </section>
  )
}

function SkillPickerRow({
  skill,
  onAdd,
}: {
  skill: Skill
  onAdd: () => void
}) {
  return (
    <li className="pd-profile__skill-picker-row">
      <div className="pd-profile__skill-picker-main">
        <span className="pd-profile__skill-picker-name">{skill.name}</span>
        {skill.department ? (
          <span className="pd-profile__skill-picker-meta">
            {skill.department}
          </span>
        ) : null}
      </div>
      <Button variant="secondary" size="sm" pill onClick={onAdd}>
        Add
      </Button>
    </li>
  )
}

import { useMemo, useState } from 'react'
import { Briefcase, Building2, CircleDot, Plus, Search, Sparkles } from 'lucide-react'
import {
  AttributeFilters,
  Button,
  EmptyState,
  Input,
  Modal,
  ResizableTable,
} from '@/components/ui'
import {
  matchesAttributeFilters,
  uniqueAttributeValues,
  type AttributeFilterMap,
} from '@/lib/filters/attributeFilters'
import { createSkill } from '@/lib/skills/store'
import { useSkillTalentCounts, useSkillsLibrary } from '@/lib/skills/useSkills'
import type { Skill, SkillStatus } from '@/lib/skills/types'

const SKILL_ATTRIBUTES = [
  { id: 'function', label: 'Function', icon: Building2 },
  { id: 'role', label: 'Role', icon: Briefcase },
  { id: 'status', label: 'Status', icon: CircleDot },
]

function statusLabel(status: SkillStatus): string {
  return status === 'draft' ? 'Draft' : 'Approved'
}

export function SkillsLibrary() {
  const { skills } = useSkillsLibrary()
  const talentCounts = useSkillTalentCounts()
  const [query, setQuery] = useState('')
  const [attributeFilters, setAttributeFilters] = useState<AttributeFilterMap>(
    {},
  )
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [fn, setFn] = useState('')
  const [role, setRole] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const attributeValues = useMemo(
    () => ({
      function: uniqueAttributeValues(skills.map((skill) => skill.function)),
      role: uniqueAttributeValues(skills.map((skill) => skill.role)),
      status: uniqueAttributeValues(skills.map((skill) => statusLabel(skill.status))),
    }),
    [skills],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return skills.filter((skill) => {
      if (
        !matchesAttributeFilters(attributeFilters, {
          function: skill.function,
          role: skill.role,
          status: statusLabel(skill.status),
        })
      ) {
        return false
      }
      if (!q) return true
      return [skill.name, skill.function, skill.role]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [attributeFilters, query, skills])

  const resetCreate = () => {
    setName('')
    setFn('')
    setRole('')
    setError(null)
    setSaving(false)
  }

  const saveSkill = () => {
    if (saving) return
    setSaving(true)
    setError(null)
    void createSkill({ name, function: fn, role })
      .then(() => {
        setCreateOpen(false)
        resetCreate()
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Could not create the skill.',
        )
        setSaving(false)
      })
  }

  return (
    <div className="pd-reviews-skills">
      <div
        className="pd-people__summary pd-people__summary--stretch"
        role="group"
        aria-label="Skills totals"
      >
        <div className="pd-people__summary-btn is-active" aria-current="true">
          <span className="pd-people__summary-label">
            <Sparkles size={14} strokeWidth={1.75} aria-hidden />
            Skills
          </span>
          <span className="pd-people__summary-value">{skills.length}</span>
        </div>
      </div>

      <div className="pd-people__header pd-people__header--bar">
        <div className="pd-people__bar-start">
          <label className="pd-people__search pd-reviews-scorecards__search">
            <Search size={16} strokeWidth={1.75} aria-hidden />
            <span className="pd-sr-only">Search skills</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search…"
              className="pd-people__search-input"
            />
          </label>
        </div>
        <div className="pd-people__bar-end">
          {filtered.length !== skills.length ? (
            <p className="pd-people__stat">{filtered.length} shown</p>
          ) : null}
          <AttributeFilters
            attributes={SKILL_ATTRIBUTES}
            valuesFor={(id) =>
              attributeValues[id as keyof typeof attributeValues] ?? []
            }
            selected={attributeFilters}
            onChange={setAttributeFilters}
            sectionLabel="Skill attributes"
          />
          <Button variant="primary" pill onClick={() => setCreateOpen(true)}>
            <Plus size={16} strokeWidth={2} aria-hidden />
            Create new skill
          </Button>
        </div>
      </div>

      <section
        className="pd-people__panel pd-people__panel--table"
        aria-labelledby="skills-heading"
      >
        <h2 id="skills-heading" className="pd-sr-only">
          Skills library
        </h2>
        {filtered.length === 0 ? (
          <EmptyState
            title={skills.length === 0 ? 'No skills yet' : 'No matches'}
            description={
              skills.length === 0
                ? 'Add skills here. Assign them on profiles, then grade those skills on the review form.'
                : 'Try a different search or filter.'
            }
            action={
              skills.length === 0 ? (
                <Button variant="primary" pill onClick={() => setCreateOpen(true)}>
                  Create new skill
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="pd-people__table-wrap">
            <ResizableTable
              className="pd-people__table pd-reviews-skills__table"
              storageKey="reviews-skills"
              columns={[
                { id: 'skill', label: 'Skill' },
                { id: 'function', label: 'Function' },
                { id: 'role', label: 'Role' },
                { id: 'talent', label: 'Talent' },
                { id: 'status', label: 'Status' },
              ]}
              fitKey={filtered.length}
            >
              <tbody>
                {filtered.map((skill) => (
                  <SkillRow
                    key={skill.id}
                    skill={skill}
                    talent={talentCounts[skill.id] ?? 0}
                  />
                ))}
              </tbody>
            </ResizableTable>
          </div>
        )}
      </section>

      <Modal
        open={createOpen}
        onClose={() => {
          if (!saving) {
            setCreateOpen(false)
            resetCreate()
          }
        }}
        title="Create new skill"
        description="Add a skill to the library. You will assign it to people later."
        actions={
          <>
            <Button
              variant="secondary"
              pill
              disabled={saving}
              onClick={() => {
                setCreateOpen(false)
                resetCreate()
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" pill loading={saving} onClick={saveSkill}>
              Create skill
            </Button>
          </>
        }
      >
        {error ? (
          <p className="pd-reviews-edit__error" role="alert">
            {error}
          </p>
        ) : null}
        <Input
          label="Skill name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Stakeholder Communication"
        />
        <Input
          label="Function"
          hint="Optional. Leave blank if this skill is company-wide."
          value={fn}
          onChange={(event) => setFn(event.target.value)}
          placeholder="e.g. Finance"
        />
        <Input
          label="Role"
          hint="Optional. Leave blank if it applies to any role."
          value={role}
          onChange={(event) => setRole(event.target.value)}
          placeholder="e.g. Manager"
        />
      </Modal>
    </div>
  )
}

function SkillRow({ skill, talent }: { skill: Skill; talent: number }) {
  return (
    <tr>
      <td>
        <span className="pd-reviews-skills__name">
          <Sparkles size={16} strokeWidth={1.75} aria-hidden />
          {skill.name}
        </span>
      </td>
      <td>{skill.function || '—'}</td>
      <td>{skill.role || '—'}</td>
      <td>{talent}</td>
      <td>
        <span
          className={
            skill.status === 'approved'
              ? 'pd-people__status pd-people__status--active'
              : 'pd-people__status pd-people__status--inactive'
          }
        >
          {statusLabel(skill.status)}
        </span>
      </td>
    </tr>
  )
}

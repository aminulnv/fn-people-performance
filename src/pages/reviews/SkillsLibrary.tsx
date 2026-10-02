import { useMemo, useState } from 'react'
import { Link, useMatch, useNavigate } from 'react-router-dom'
import { Briefcase, CircleDot, Plus, Search, Sparkles } from 'lucide-react'
import {
  AttributeFilters,
  Badge,
  EmptyState,
  ResizableTable,
} from '@/components/ui'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { useAuth } from '@/lib/useAuth'
import {
  matchesAttributeFilters,
  uniqueAttributeValues,
  type AttributeFilterMap,
} from '@/lib/filters/attributeFilters'
import {
  formatRoleUsageLabel,
  type SkillRoleRef,
} from '@/lib/roles/inheritedSkills'
import {
  skillCreatePath,
  skillDetailPath,
  skillsLibraryPath,
} from '@/lib/organisation/paths'
import {
  useSkillRoleUsage,
  useSkillTalentCounts,
  useSkillsLibrary,
} from '@/lib/skills/useSkills'
import type { Skill, SkillStatus } from '@/lib/skills/types'
import { SettingsSidePanel } from './SettingsSidePanel'
import { SkillFormFields } from './SkillFormEditor'
import '@/styles/layout-organisation.css'

const SKILL_ATTRIBUTES = [
  { id: 'role', label: 'Used by', icon: Briefcase },
  { id: 'status', label: 'Status', icon: CircleDot },
]

function statusLabel(status: SkillStatus): string {
  return status === 'inactive' ? 'Inactive' : 'Active'
}

export function SkillsLibrary() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = hasSystemPermission(user?.permissions, 'platform.write_all')
  const { skills } = useSkillsLibrary()
  const talentCounts = useSkillTalentCounts()
  const roleUsage = useSkillRoleUsage()
  const [query, setQuery] = useState('')
  const [attributeFilters, setAttributeFilters] = useState<AttributeFilterMap>(
    {},
  )

  const createMatch = useMatch('/organisation/skills/new')
  const isCreateOpen = Boolean(createMatch)

  const attributeValues = useMemo(
    () => ({
      role: uniqueAttributeValues(
        skills.flatMap((skill) => {
          const names = (roleUsage[skill.id] ?? []).map((role) => role.name)
          return names.length > 0 ? names : ['']
        }),
      ),
      status: uniqueAttributeValues(
        skills.map((skill) => statusLabel(skill.status)),
      ),
    }),
    [roleUsage, skills],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return skills.filter((skill) => {
      const roles = roleUsage[skill.id] ?? []
      const roleNames = roles.map((role) => role.name)
      if (
        !matchesAttributeFilters(attributeFilters, {
          role: roleNames.length > 0 ? roleNames : [''],
          status: statusLabel(skill.status),
        })
      ) {
        return false
      }
      if (!q) return true
      return [skill.name, ...roleNames].join(' ').toLowerCase().includes(q)
    })
  }, [attributeFilters, query, roleUsage, skills])

  const closePanel = () => {
    navigate(skillsLibraryPath())
  }

  return (
    <div className="pd-reviews-skills">
      <div
        className="pd-people__summary pd-people__summary--stretch"
        role="group"
        aria-label="Skills totals"
      >
        <div className="pd-people__summary-card">
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
          {canWrite ? (
            <Link
              to={skillCreatePath()}
              className="pd-btn pd-btn--primary pd-btn--pill"
            >
              <Plus size={16} strokeWidth={2} aria-hidden />
              Create New Skill
            </Link>
          ) : null}
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
          <div className="pd-people__empty-state">
            <EmptyState
              className="pd-people__empty-panel"
              icon={Sparkles}
              title={skills.length === 0 ? 'No Skills Yet' : 'No Matches'}
              description={
                skills.length === 0
                  ? 'Skills are added by an admin, then attached to a role.'
                  : 'Try a different search or filter.'
              }
              action={
                skills.length === 0 && canWrite ? (
                  <Link
                    to={skillCreatePath()}
                    className="pd-people__create-btn"
                  >
                    <Plus size={18} strokeWidth={2} aria-hidden />
                    Create New Skill
                  </Link>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="pd-people__table-wrap">
            <ResizableTable
              className="pd-people__table pd-reviews-skills__table"
              storageKey="reviews-skills-v4"
              evenColumns
              columns={[
                { id: 'skill', label: 'Skill' },
                { id: 'role', label: 'Used by' },
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
                    roles={roleUsage[skill.id] ?? []}
                    talent={talentCounts[skill.id] ?? 0}
                    onOpen={() => {
                      navigate(skillDetailPath(skill.id))
                    }}
                  />
                ))}
              </tbody>
            </ResizableTable>
          </div>
        )}
      </section>

      {isCreateOpen ? (
        <SettingsSidePanel
          label="Create New Skill"
          closeLabel="Close skill panel"
          defaultWidth={480}
          onClose={closePanel}
        >
          {canWrite ? (
            <SkillFormFields
              mode="create"
              onCancel={closePanel}
              onSaved={(saved) => navigate(skillDetailPath(saved.id))}
            />
          ) : (
            <p className="pd-reviews-flow__hint">
              Only an admin with write access can add skills.
            </p>
          )}
        </SettingsSidePanel>
      ) : null}
    </div>
  )
}

function SkillRow({
  skill,
  roles,
  talent,
  onOpen,
}: {
  skill: Skill
  roles: SkillRoleRef[]
  talent: number
  onOpen: () => void
}) {
  const usedBy = formatRoleUsageLabel(roles)
  return (
    <tr
      className="pd-people__row-link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
    >
      <td>{skill.name}</td>
      <td title={roles.map((role) => role.name).join(', ') || undefined}>
        {usedBy || '—'}
      </td>
      <td>{talent}</td>
      <td>
        <Badge
          variant={skill.status === 'active' ? 'completed' : 'draft'}
        >
          {statusLabel(skill.status)}
        </Badge>
      </td>
    </tr>
  )
}

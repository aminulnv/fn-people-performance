import { useMemo, useState } from 'react'
import {
  Link,
  Navigate,
  useMatch,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { Briefcase, Building2, CircleDot, Plus, Search, Sparkles } from 'lucide-react'
import {
  AttributeFilters,
  EmptyState,
  ResizableTable,
  SegmentedControl,
} from '@/components/ui'
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
  skillEditPath,
  skillsLibraryPath,
} from '@/lib/reviews/paths'
import {
  useSkill,
  useSkillRoleUsage,
  useSkillTalentCounts,
  useSkillsLibrary,
} from '@/lib/skills/useSkills'
import type { Skill, SkillStatus } from '@/lib/skills/types'
import { SettingsSidePanel } from './SettingsSidePanel'
import { SkillFormFields } from './SkillFormEditor'
import { SkillRolesMatrix } from './SkillRolesMatrix'
import '@/styles/layout-organisation.css'

const SKILL_ATTRIBUTES = [
  { id: 'department', label: 'Department', icon: Building2 },
  { id: 'role', label: 'Used by', icon: Briefcase },
  { id: 'status', label: 'Status', icon: CircleDot },
]

type PanelMode =
  | { kind: 'create' }
  | { kind: 'edit'; skillId: string }

type SkillPanelTab = 'overview' | 'roles'

function panelModeFromRoute(
  isCreate: boolean,
  skillId: string | undefined,
): PanelMode | null {
  if (isCreate) return { kind: 'create' }
  if (skillId) return { kind: 'edit', skillId }
  return null
}

function statusLabel(status: SkillStatus): string {
  return status === 'draft' ? 'Draft' : 'Approved'
}

function parseSkillPanelTab(raw: string | null): SkillPanelTab {
  return raw === 'roles' ? 'roles' : 'overview'
}

export function SkillsLibrary() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { skills } = useSkillsLibrary()
  const talentCounts = useSkillTalentCounts()
  const roleUsage = useSkillRoleUsage()
  const [query, setQuery] = useState('')
  const [attributeFilters, setAttributeFilters] = useState<AttributeFilterMap>(
    {},
  )
  const panelTab = parseSkillPanelTab(searchParams.get('tab'))

  const createMatch = useMatch('/reviews/skills/new')
  const editMatch = useMatch('/reviews/skills/:skillId/edit')
  const bareMatch = useMatch({ path: '/reviews/skills/:skillId', end: true })
  const panel = panelModeFromRoute(
    Boolean(createMatch),
    editMatch?.params.skillId,
  )
  const panelSkill = useSkill(
    panel && panel.kind === 'edit' ? panel.skillId : '',
  )
  // Legacy `/reviews/skills/:id` → edit panel (App uses a splat so the
  // library stays mounted when opening create/edit).
  const redirectToEdit =
    !createMatch && !editMatch && bareMatch?.params.skillId
      ? skillEditPath(bareMatch.params.skillId)
      : null

  const roleCount =
    panel?.kind === 'edit' && panelSkill
      ? (roleUsage[panelSkill.id] ?? []).length
      : 0

  const skillPanelTabs = useMemo(
    () => [
      { id: 'overview' as const, label: 'Overview' },
      {
        id: 'roles' as const,
        label: (
          <span className="pd-org-role__tab-label">
            Roles
            {roleCount > 0 ? (
              <span className="pd-org-role__tab-badge">{roleCount}</span>
            ) : null}
          </span>
        ),
      },
    ],
    [roleCount],
  )
  const attributeValues = useMemo(
    () => ({
      department: uniqueAttributeValues(skills.map((skill) => skill.department)),
      role: uniqueAttributeValues(
        skills.flatMap((skill) => {
          const names = (roleUsage[skill.id] ?? []).map((role) => role.name)
          return names.length > 0 ? names : ['']
        }),
      ),
      status: uniqueAttributeValues(skills.map((skill) => statusLabel(skill.status))),
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
          department: skill.department,
          role: roleNames.length > 0 ? roleNames : [''],
          status: statusLabel(skill.status),
        })
      ) {
        return false
      }
      if (!q) return true
      return [skill.name, skill.department, ...roleNames]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [attributeFilters, query, roleUsage, skills])

  const selectedId = panel?.kind === 'edit' ? panel.skillId : null

  const closePanel = () => {
    navigate(skillsLibraryPath())
  }

  const panelTitle =
    panel?.kind === 'create' ? 'Create New Skill' : 'Edit skill'

  if (redirectToEdit) {
    return <Navigate to={redirectToEdit} replace />
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
          <Link
            to={skillCreatePath()}
            className="pd-btn pd-btn--primary pd-btn--pill"
          >
            <Plus size={16} strokeWidth={2} aria-hidden />
            Create New Skill
          </Link>
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
                  ? 'Add skills here. Assign them on roles or profiles, then grade those skills on the review form.'
                  : 'Try a different search or filter.'
              }
              action={
                skills.length === 0 ? (
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
              storageKey="reviews-skills"
              columns={[
                { id: 'skill', label: 'Skill', grow: true },
                { id: 'department', label: 'Department' },
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
                    selected={selectedId === skill.id}
                    onOpen={() => navigate(skillEditPath(skill.id))}
                  />
                ))}
              </tbody>
            </ResizableTable>
          </div>
        )}
      </section>

      {panel ? (
        <SettingsSidePanel
          label={panelTitle}
          closeLabel="Close skill panel"
          defaultWidth={panel.kind === 'edit' ? 880 : 480}
          onClose={closePanel}
          subnav={
            panel.kind === 'edit' ? (
              <SegmentedControl
                className="pd-org-role__tabs"
                buttonClassName="pd-org-role__tab"
                options={skillPanelTabs}
                value={panelTab}
                onChange={(next) => {
                  const params = new URLSearchParams(searchParams)
                  if (next === 'overview') params.delete('tab')
                  else params.set('tab', next)
                  setSearchParams(params, { replace: true })
                }}
                aria-label="Skill sections"
              />
            ) : undefined
          }
        >
          {panel.kind === 'create' ? (
            <SkillFormFields
              mode="create"
              onCancel={closePanel}
              onSaved={closePanel}
            />
          ) : panelTab === 'roles' && panelSkill ? (
            <SkillRolesMatrix
              skillId={panelSkill.id}
              skillName={panelSkill.name}
            />
          ) : (
            <SkillFormFields
              key={panel.skillId}
              mode="edit"
              existing={panelSkill}
              onCancel={closePanel}
              onSaved={closePanel}
            />
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
  selected,
  onOpen,
}: {
  skill: Skill
  roles: SkillRoleRef[]
  talent: number
  selected: boolean
  onOpen: () => void
}) {
  const usedBy = formatRoleUsageLabel(roles)
  return (
    <tr
      className={['pd-people__row-link', selected ? 'is-selected' : '']
        .filter(Boolean)
        .join(' ')}
      data-selected={selected || undefined}
      tabIndex={0}
      aria-selected={selected}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
    >
      <td>{skill.name}</td>
      <td>{skill.department || '—'}</td>
      <td title={roles.map((role) => role.name).join(', ') || undefined}>
        {usedBy || '—'}
      </td>
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

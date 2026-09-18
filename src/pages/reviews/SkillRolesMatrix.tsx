import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui'
import { roleDetailPath } from '@/lib/organisation/paths'
import {
  matrixGrades,
  skillRoleMatrixRows,
  type SkillRoleMatrixRow,
} from '@/lib/roles/inheritedSkills'
import { expectedLevelLabel } from '@/lib/roles/labels'
import type { ExpectedSkillLevel } from '@/lib/roles/types'
import { useRolesCatalog } from '@/lib/roles/useRoles'
import { Briefcase } from 'lucide-react'
import '@/styles/layout-organisation.css'

function levelCell(level: ExpectedSkillLevel | undefined) {
  const value = level && level !== 'none' ? level : null
  if (!value) {
    return <span className="pd-org-role-matrix__level-empty">—</span>
  }
  return (
    <span
      className={[
        'pd-org-role-matrix__level',
        `pd-org-role-matrix__level--${value}`,
      ].join(' ')}
    >
      {expectedLevelLabel(value)}
    </span>
  )
}

export function SkillRolesMatrix({
  skillId,
  skillName,
}: {
  skillId: string
  skillName: string
}) {
  const { roles } = useRolesCatalog()
  const allGrades = useMemo(() => matrixGrades(), [roles])
  const rows = useMemo(
    () => skillRoleMatrixRows(skillId),
    [roles, skillId],
  )

  // Default: grades that have any expectation for this skill; fall back to all.
  const gradesWithData = useMemo(() => {
    const seen = new Set<string>()
    for (const row of rows) {
      for (const [grade, level] of Object.entries(row.expectations)) {
        if (level && level !== 'none') seen.add(grade)
      }
    }
    const ordered = allGrades.filter((grade) => seen.has(grade))
    return ordered.length > 0 ? ordered : allGrades
  }, [allGrades, rows])

  const [visibleGrades, setVisibleGrades] = useState<string[] | null>(null)
  const grades = visibleGrades ?? gradesWithData

  if (rows.length === 0) {
    return (
      <div className="pd-people__empty-state">
        <EmptyState
          className="pd-people__empty-panel"
          icon={Briefcase}
          title="Not on any role yet"
          description={`Attach “${skillName}” from a role’s competency matrix under Organisation.`}
        />
      </div>
    )
  }

  return (
    <section
      className="pd-people__panel pd-people__panel--table pd-org-role-matrix pd-skill-roles-matrix"
      aria-label="Roles using this skill"
    >
      <header className="pd-org-detail__panel-head pd-skill-roles-matrix__head">
        <div className="pd-org-role-matrix__head-copy">
          <h2 className="pd-org-detail__panel-title">Roles</h2>
          <p className="pd-org-role-matrix__hint">
            Expected levels by seniority. Edit them on each role’s competency
            matrix.
          </p>
        </div>
        <GradeVisibilityControl
          allGrades={allGrades}
          selected={grades}
          onChange={setVisibleGrades}
        />
      </header>

      <div className="pd-people__table-wrap">
        <table className="pd-people__table pd-org-role-matrix__table">
          <thead>
            <tr>
              <th scope="col" className="pd-org-role-matrix__col-skill">
                Role
              </th>
              <th scope="col">Function</th>
              <th scope="col" className="pd-org-role-matrix__col-weight">
                Headcount
              </th>
              {grades.map((grade) => (
                <th
                  key={grade}
                  scope="col"
                  className="pd-org-role-matrix__col-grade"
                >
                  {grade}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <SkillRoleRow key={row.roleId} row={row} grades={grades} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SkillRoleRow({
  row,
  grades,
}: {
  row: SkillRoleMatrixRow
  grades: string[]
}) {
  return (
    <tr>
      <td className="pd-org-role-matrix__col-skill">
        <Link
          to={roleDetailPath(row.roleId, 'matrix')}
          className="pd-org-role-matrix__skill-name pd-skill-roles-matrix__role-link"
        >
          {row.roleName}
        </Link>
      </td>
      <td>{row.departmentName || '—'}</td>
      <td className="pd-org-role-matrix__col-weight">{row.headcount}</td>
      {grades.map((grade) => (
        <td key={grade} className="pd-org-role-matrix__col-grade">
          {levelCell(row.expectations[grade])}
        </td>
      ))}
    </tr>
  )
}

function GradeVisibilityControl({
  allGrades,
  selected,
  onChange,
}: {
  allGrades: string[]
  selected: string[]
  onChange: (next: string[] | null) => void
}) {
  if (allGrades.length === 0) return null
  const label =
    selected.length === 0
      ? 'No grades'
      : selected.length === allGrades.length
        ? `${selected[0]} – ${selected[selected.length - 1]}`
        : `${selected[0]} – ${selected[selected.length - 1]} (${selected.length})`

  return (
    <details className="pd-skill-roles-matrix__grades">
      <summary className="pd-skill-roles-matrix__grades-summary">{label}</summary>
      <div className="pd-skill-roles-matrix__grades-menu" role="group" aria-label="Visible grades">
        <button
          type="button"
          className="pd-btn pd-btn--secondary pd-btn--sm"
          onClick={() => onChange(null)}
        >
          Reset
        </button>
        <ul className="pd-skill-roles-matrix__grades-list">
          {allGrades.map((grade) => {
            const checked = selected.includes(grade)
            return (
              <li key={grade}>
                <label className="pd-skill-roles-matrix__grades-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? selected.filter((item) => item !== grade)
                        : allGrades.filter(
                            (item) =>
                              selected.includes(item) || item === grade,
                          )
                      onChange(next)
                    }}
                  />
                  {grade}
                </label>
              </li>
            )
          })}
        </ul>
      </div>
    </details>
  )
}

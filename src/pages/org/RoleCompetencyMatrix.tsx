import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui'
import { expectedLevelLabel, roleWeightTotal } from '@/lib/roles/labels'
import { matrixGrades } from '@/lib/roles/inheritedSkills'
import { updateRoleMatrix } from '@/lib/roles/store'
import type { ExpectedSkillLevel, PlatformRole, RoleSkill } from '@/lib/roles/types'
import { EXPECTED_SKILL_LEVELS } from '@/lib/roles/types'
import { useSkillsLibrary } from '@/lib/skills/useSkills'
import { RoleSkillsDrawer } from '@/pages/org/RoleSkillsDrawer'

export function RoleCompetencyMatrix({
  role,
  canEdit,
}: {
  role: PlatformRole
  canEdit: boolean
}) {
  const { skills: library } = useSkillsLibrary()
  const grades = useMemo(() => matrixGrades(), [])
  const [rows, setRows] = useState<RoleSkill[]>(() => role.skills)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    setRows(role.skills)
  }, [role.id, role.updatedAt])

  const weightTotal = roleWeightTotal(rows.map((row) => row.weightPct))
  const weightHint =
    rows.length === 0
      ? ''
      : Math.abs(weightTotal - 100) < 0.01
        ? 'Weights total 100%.'
        : `Weights total ${weightTotal}%. Aim for 100 — this does not block save.`

  function updateRow(skillId: string, patch: Partial<RoleSkill>) {
    setRows((current) =>
      current.map((row) =>
        row.skillId === skillId ? { ...row, ...patch } : row,
      ),
    )
  }

  function setExpectation(
    skillId: string,
    grade: string,
    level: ExpectedSkillLevel,
  ) {
    setRows((current) =>
      current.map((row) => {
        if (row.skillId !== skillId) return row
        return {
          ...row,
          expectations: { ...row.expectations, [grade]: level },
        }
      }),
    )
  }

  function applyAttachedSkills(nextAttached: RoleSkill[]) {
    const previousById = new Map(rows.map((row) => [row.skillId, row]))
    setRows(
      nextAttached.map((row) => previousById.get(row.skillId) ?? row),
    )
  }

  async function onSave() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const next = await updateRoleMatrix(role.id, rows)
      setRows(next.skills)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save matrix.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="pd-people__panel pd-people__panel--table pd-org-role-matrix"
      aria-label="Competency matrix"
    >
      <header className="pd-org-detail__panel-head">
        <div className="pd-org-role-matrix__head-copy">
          <h2 className="pd-org-detail__panel-title">Competency matrix</h2>
          {weightHint ? (
            <p className="pd-org-role-matrix__hint">{weightHint}</p>
          ) : null}
        </div>
        {canEdit ? (
          <div className="pd-org-role-matrix__actions">
            <Button
              variant="secondary"
              size="sm"
              pill
              onClick={() => setPickerOpen(true)}
            >
              <Plus size={14} strokeWidth={2} aria-hidden />
              Add skill
            </Button>
            <Button
              variant="primary"
              size="sm"
              pill
              disabled={busy}
              onClick={() => {
                void onSave()
              }}
            >
              Save matrix
            </Button>
          </div>
        ) : null}
      </header>
      {error ? (
        <p className="pd-people__message pd-people__message--error pd-org-role-matrix__error">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="pd-people__empty">
          No skills on this role yet. Add skills from the library to set
          expected levels by job grade.
        </p>
      ) : (
        <div className="pd-people__table-wrap">
          <table className="pd-people__table pd-org-role-matrix__table">
            <thead>
              <tr>
                <th scope="col" className="pd-org-role-matrix__col-skill">
                  Skill
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
                <th scope="col" className="pd-org-role-matrix__col-weight">
                  Weight
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.skillId}>
                  <td className="pd-org-role-matrix__col-skill">
                    <span className="pd-org-role-matrix__skill-name">
                      {row.skillName}
                    </span>
                  </td>
                  {grades.map((grade) => {
                    const value = row.expectations[grade] ?? 'none'
                    return (
                      <td
                        key={grade}
                        className="pd-org-role-matrix__col-grade"
                      >
                        {canEdit ? (
                          <select
                            className={[
                              'pd-org-role-matrix__level',
                              `pd-org-role-matrix__level--${value}`,
                              'is-editable',
                            ].join(' ')}
                            aria-label={`${row.skillName} expected level for ${grade}`}
                            value={value}
                            onChange={(event) =>
                              setExpectation(
                                row.skillId,
                                grade,
                                event.target.value as ExpectedSkillLevel,
                              )
                            }
                          >
                            {EXPECTED_SKILL_LEVELS.map((level) => (
                              <option key={level} value={level}>
                                {expectedLevelLabel(level)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={[
                              'pd-org-role-matrix__level',
                              `pd-org-role-matrix__level--${value}`,
                            ].join(' ')}
                          >
                            {expectedLevelLabel(value)}
                          </span>
                        )}
                      </td>
                    )
                  })}
                  <td className="pd-org-role-matrix__col-weight">
                    {canEdit ? (
                      <label className="pd-org-role-matrix__weight-field">
                        <span className="pd-sr-only">
                          {row.skillName} weight
                        </span>
                        <input
                          className="pd-org-role-matrix__weight"
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={row.weightPct}
                          onChange={(event) =>
                            updateRow(row.skillId, {
                              weightPct: Number(event.target.value) || 0,
                            })
                          }
                        />
                        <span aria-hidden>%</span>
                      </label>
                    ) : (
                      <span className="pd-org-role-matrix__weight-read">
                        {row.weightPct}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RoleSkillsDrawer
        open={pickerOpen}
        roleName={role.name}
        attached={rows}
        library={library}
        onClose={() => setPickerOpen(false)}
        onSave={applyAttachedSkills}
      />
    </section>
  )
}

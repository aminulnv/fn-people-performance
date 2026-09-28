import { useDeferredValue, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  Avatar,
  ListboxSelect,
  SearchField,
  SegmentedControl,
} from '@/components/ui'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  saveDepartmentCalibrators,
  savePersonCalibrators,
  saveTeamCalibrators,
  type CalibratorAssignments,
} from '@/lib/calibration/sessionApi'
import { HintIcon } from '@/pages/reviews/HintIcon'
import { SettingsSidePanel } from '@/pages/reviews/SettingsSidePanel'
import '@/styles/layout-reviews.css'

type Scope = 'department' | 'team' | 'person'

const SCOPE_OPTIONS = [
  { id: 'department' as const, label: 'Department' },
  { id: 'team' as const, label: 'Team' },
  { id: 'person' as const, label: 'Person' },
]

const PANEL_HINT =
  'A Calibrator Can Change Grades For One Department, One Team, Or One Person. Heads Of Department And HRBPs Can Always Change Grades In Their Department.'

export function DepartmentCalibratorsDialog({
  assignments,
  employees,
  onClose,
  onChange,
  initialPersonId = null,
}: {
  assignments: CalibratorAssignments
  employees: readonly PlatformEmployee[]
  onClose: () => void
  onChange: (next: CalibratorAssignments) => void
  /** Opens on the Person tab with this subject pre-selected. */
  initialPersonId?: number | null
}) {
  const [scope, setScope] = useState<Scope>(
    initialPersonId != null ? 'person' : 'department',
  )
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [personId, setPersonId] = useState<number | null>(initialPersonId)

  const people = useMemo(
    () =>
      [...employees]
        .filter((employee) => employee.isActive)
        .sort((left, right) => left.fullName.localeCompare(right.fullName)),
    [employees],
  )
  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.employeeId, employee])),
    [employees],
  )

  async function save(key: string, run: () => Promise<void>) {
    setSavingKey(key)
    setError(null)
    try {
      await run()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could Not Save Calibrators.',
      )
    } finally {
      setSavingKey(null)
    }
  }

  function optionsFor(
    assigned: readonly number[],
    exceptIds: readonly number[] = [],
  ) {
    const taken = new Set(assigned)
    const excluded = new Set(exceptIds)
    return people
      .filter(
        (employee) =>
          !excluded.has(employee.employeeId) &&
          !taken.has(employee.employeeId),
      )
      .map((employee) => ({
        value: String(employee.employeeId),
        label: employee.fullName,
        description: [employee.team, employee.department]
          .filter(Boolean)
          .join(' · '),
      }))
  }

  function departmentByName(departmentName: string | null | undefined) {
    const key = departmentName?.trim().toLocaleLowerCase() ?? ''
    if (!key) return null
    return (
      assignments.departments.find(
        (row) => row.department.trim().toLocaleLowerCase() === key,
      ) ?? null
    )
  }

  function teamBySubject(subject: {
    teamId?: number | null
    team?: string | null
    department?: string | null
  }) {
    const teamId = subject.teamId
    const teamName = subject.team?.trim().toLocaleLowerCase() ?? ''
    const department = subject.department?.trim().toLocaleLowerCase() ?? ''
    return (
      assignments.teams.find((row) => {
        if (teamId && row.teamId === teamId) return true
        return (
          teamName.length > 0 &&
          row.team.trim().toLocaleLowerCase() === teamName &&
          row.department.trim().toLocaleLowerCase() === department
        )
      }) ?? null
    )
  }

  /** Head, HRBP, and department extras — inherited by every team/person in the dept. */
  function inheritedDepartmentCalibrators(
    departmentName: string | null | undefined,
    exceptId?: number | null,
  ) {
    const department = departmentByName(departmentName)
    if (!department) return [] as { employeeId: number; role: string }[]
    const rows: { employeeId: number; role: string }[] = []
    const seen = new Set<number>()
    const add = (employeeId: number | null | undefined, role: string) => {
      if (employeeId == null || employeeId === exceptId || seen.has(employeeId)) {
        return
      }
      seen.add(employeeId)
      rows.push({ employeeId, role })
    }
    add(department.headEmployeeId, 'Head')
    add(department.hrbpEmployeeId, 'HRBP')
    for (const employeeId of department.employeeIds) {
      add(employeeId, 'Dept')
    }
    return rows
  }

  /** Department inheritance plus any team-scope extras. */
  function inheritedForPerson(subject: PlatformEmployee) {
    const rows = inheritedDepartmentCalibrators(
      subject.department,
      subject.employeeId,
    )
    const seen = new Set(rows.map((row) => row.employeeId))
    const team = teamBySubject(subject)
    for (const employeeId of team?.employeeIds ?? []) {
      if (employeeId === subject.employeeId || seen.has(employeeId)) continue
      seen.add(employeeId)
      rows.push({ employeeId, role: 'Team' })
    }
    return rows
  }

  function matchesQuery(...parts: Array<string | number | null | undefined>) {
    if (!deferredQuery) return true
    return parts
      .filter((part) => part != null && part !== '')
      .join(' ')
      .toLowerCase()
      .includes(deferredQuery)
  }

  const departmentRows = useMemo(
    () =>
      assignments.departments.filter((department) => {
        const head = department.headEmployeeId
          ? employeeById.get(department.headEmployeeId)?.fullName
          : null
        const hrbp = department.hrbpEmployeeId
          ? employeeById.get(department.hrbpEmployeeId)?.fullName
          : null
        return matchesQuery(department.department, head, hrbp)
      }),
    [assignments.departments, deferredQuery, employeeById],
  )

  const teamRows = useMemo(
    () =>
      assignments.teams.filter((team) =>
        matchesQuery(team.team, team.department),
      ),
    [assignments.teams, deferredQuery],
  )

  const selectedPerson = assignments.people.find(
    (row) => row.subjectEmployeeId === personId,
  )

  const existingPersonRows = useMemo(
    () =>
      [...assignments.people]
        .filter((row) => {
          const subject = employeeById.get(row.subjectEmployeeId)
          return matchesQuery(
            subject?.fullName,
            subject?.team,
            subject?.department,
            row.subjectEmployeeId,
          )
        })
        .sort((left, right) => {
          const leftName =
            employeeById.get(left.subjectEmployeeId)?.fullName ?? ''
          const rightName =
            employeeById.get(right.subjectEmployeeId)?.fullName ?? ''
          return leftName.localeCompare(rightName)
        }),
    [assignments.people, deferredQuery, employeeById],
  )

  return (
    <SettingsSidePanel
      label="Assign Calibrators"
      closeLabel="Close Assign Calibrators"
      defaultWidth={680}
      onClose={onClose}
      title={
        <div className="pd-cal-drawer__title-block">
          <h2 className="pd-settings-panel__title">
            Assign Calibrators
            <HintIcon content={PANEL_HINT} label="About Calibrators" />
          </h2>
          <p className="pd-cal-drawer__title-meta">
            Changes Save As You Add Or Remove People.
          </p>
        </div>
      }
      subnav={
        <SegmentedControl
          aria-label="Calibrator Scope"
          value={scope}
          onChange={(next) => {
            setScope(next)
            setQuery('')
            setError(null)
          }}
          options={SCOPE_OPTIONS}
        />
      }
    >
      <div className="pd-cal-calibrators-panel">
        <SearchField
          label={
            scope === 'department'
              ? 'Search Departments'
              : scope === 'team'
                ? 'Search Teams'
                : 'Search People'
          }
          value={query}
          placeholder={
            scope === 'department'
              ? 'Filter Departments'
              : scope === 'team'
                ? 'Filter Teams'
                : 'Filter People With Calibrators'
          }
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery('')}
        />

        {error ? (
          <p className="pd-field__error" role="alert">
            {error}
          </p>
        ) : null}

        {scope === 'department' ? (
          <AssignmentTable
            labelColumn="Department"
            empty={
              deferredQuery ? 'No Departments Match.' : 'No Departments Yet.'
            }
            rows={departmentRows.map((department) => {
              const alwaysOn = [
                department.headEmployeeId
                  ? {
                      employeeId: department.headEmployeeId,
                      role: 'Head',
                    }
                  : null,
                department.hrbpEmployeeId
                  ? {
                      employeeId: department.hrbpEmployeeId,
                      role: 'HRBP',
                    }
                  : null,
              ].filter(
                (row): row is { employeeId: number; role: string } =>
                  row != null,
              )
              return {
                key: `department:${department.departmentId}`,
                label: department.department,
                alwaysOn,
                employeeIds: department.employeeIds,
                saving: savingKey === `department:${department.departmentId}`,
                options: optionsFor(
                  department.employeeIds,
                  alwaysOn.map((row) => row.employeeId),
                ),
                onChange: (employeeIds: number[]) =>
                  void save(
                    `department:${department.departmentId}`,
                    async () => {
                      const next = await saveDepartmentCalibrators(
                        department.departmentId,
                        employeeIds,
                      )
                      if (!next) return
                      onChange({
                        ...assignments,
                        departments: assignments.departments.map((row) =>
                          row.departmentId === next.departmentId ? next : row,
                        ),
                      })
                    },
                  ),
              }
            })}
            employeeById={employeeById}
          />
        ) : null}

        {scope === 'team' ? (
          <AssignmentTable
            labelColumn="Team"
            empty={deferredQuery ? 'No teams match.' : 'No teams yet.'}
            rows={teamRows.map((team) => {
              const alwaysOn = inheritedDepartmentCalibrators(team.department)
              const alwaysIds = new Set(alwaysOn.map((row) => row.employeeId))
              const employeeIds = team.employeeIds.filter(
                (id) => !alwaysIds.has(id),
              )
              return {
                key: `team:${team.teamId}`,
                label: team.team,
                meta: team.department,
                alwaysOn: alwaysOn.length > 0 ? alwaysOn : undefined,
                employeeIds,
                saving: savingKey === `team:${team.teamId}`,
                options: optionsFor(employeeIds, [...alwaysIds]),
                onChange: (nextIds) =>
                  void save(`team:${team.teamId}`, async () => {
                    const next = await saveTeamCalibrators(
                      team.teamId,
                      nextIds,
                    )
                    if (!next) return
                    onChange({
                      ...assignments,
                      teams: assignments.teams.map((row) =>
                        row.teamId === next.teamId ? next : row,
                      ),
                    })
                  }),
              }
            })}
            employeeById={employeeById}
          />
        ) : null}

        {scope === 'person' ? (
          <div className="pd-cal-calibrators-panel__person">
            <ListboxSelect
              value={personId == null ? '' : String(personId)}
              allowEmpty
              emptyLabel="Choose A Person"
              searchable
              aria-label="Person Whose Grade Can Be Changed"
              options={people.map((employee) => ({
                value: String(employee.employeeId),
                label: employee.fullName,
                description: [employee.team, employee.department]
                  .filter(Boolean)
                  .join(' · '),
              }))}
              onValueChange={(value) => {
                const id = Number(value)
                setPersonId(Number.isInteger(id) && id > 0 ? id : null)
              }}
            />

            {personId != null ? (
              <AssignmentTable
                labelColumn="Person"
                empty=""
                rows={(() => {
                  const subject = employeeById.get(personId)
                  const alwaysOn = subject
                    ? inheritedForPerson(subject)
                    : inheritedDepartmentCalibrators(
                        employeeById.get(personId)?.department,
                        personId,
                      )
                  const alwaysIds = new Set(
                    alwaysOn.map((row) => row.employeeId),
                  )
                  const employeeIds = (
                    selectedPerson?.employeeIds ?? []
                  ).filter((id) => !alwaysIds.has(id))
                  return [
                    {
                      key: `person:${personId}`,
                      label:
                        subject?.fullName ?? String(personId),
                      meta:
                        [subject?.team, subject?.department]
                          .filter(Boolean)
                          .join(' · ') || undefined,
                      alwaysOn:
                        alwaysOn.length > 0 ? alwaysOn : undefined,
                      employeeIds,
                      saving: savingKey === `person:${personId}`,
                      options: optionsFor(employeeIds, [
                        personId,
                        ...alwaysIds,
                      ]),
                      onChange: (nextIds) =>
                        void save(`person:${personId}`, async () => {
                          const next = await savePersonCalibrators(
                            personId,
                            nextIds,
                          )
                          const peopleRows = assignments.people.filter(
                            (row) => row.subjectEmployeeId !== personId,
                          )
                          onChange({
                            ...assignments,
                            people: next ? [...peopleRows, next] : peopleRows,
                          })
                        }),
                    },
                  ]
                })()}
                employeeById={employeeById}
              />
            ) : (
              <p className="pd-cal-calibrators-panel__hint">
                Choose a person, then add who can change only their grade.
              </p>
            )}

            {existingPersonRows.length > 0 ? (
              <section
                className="pd-cal-calibrators-panel__existing"
                aria-label="People With Calibrators"
              >
                <h3 className="pd-cal-calibrators-panel__existing-title">
                  Already Assigned
                </h3>
                <ul className="pd-cal-calibrators-panel__existing-list">
                  {existingPersonRows.map((row) => (
                    <li key={row.subjectEmployeeId}>
                      <button
                        type="button"
                        className={
                          personId === row.subjectEmployeeId
                            ? 'pd-cal-calibrators-panel__existing-row is-active'
                            : 'pd-cal-calibrators-panel__existing-row'
                        }
                        onClick={() => setPersonId(row.subjectEmployeeId)}
                      >
                        <Avatar
                          name={
                            employeeById.get(row.subjectEmployeeId)?.fullName ??
                            String(row.subjectEmployeeId)
                          }
                          src={
                            employeeById.get(row.subjectEmployeeId)?.avatarUrl
                          }
                          size="sm"
                        />
                        <span className="pd-cal-calibrators-panel__existing-copy">
                          <span className="pd-cal-calibrators-panel__existing-name">
                            {employeeById.get(row.subjectEmployeeId)
                              ?.fullName ?? row.subjectEmployeeId}
                          </span>
                          <span className="pd-cal-calibrators-panel__existing-meta">
                            {row.employeeIds.length === 1
                              ? '1 Calibrator'
                              : `${row.employeeIds.length} Calibrators`}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </SettingsSidePanel>
  )
}

function AssignmentTable({
  labelColumn,
  rows,
  empty,
  employeeById,
}: {
  labelColumn: string
  rows: {
    key: string
    label: string
    meta?: string
    alwaysOn?: { employeeId: number; role: string }[]
    employeeIds: number[]
    saving: boolean
    options: { value: string; label: string; description?: string }[]
    onChange: (employeeIds: number[]) => void
  }[]
  empty: string
  employeeById: Map<number, PlatformEmployee>
}) {
  if (rows.length === 0) {
    return empty ? (
      <p className="pd-cal-calibrators-panel__empty">{empty}</p>
    ) : null
  }

  return (
    <div className="pd-cal-calibrators-panel__table-wrap">
      <table className="pd-cal-calibrators-panel__table">
        <thead>
          <tr>
            <th scope="col">{labelColumn}</th>
            <th scope="col">Calibrators</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <AssignmentRow
              key={row.key}
              label={row.label}
              meta={row.meta}
              alwaysOn={row.alwaysOn}
              employeeIds={row.employeeIds}
              saving={row.saving}
              options={row.options}
              employeeById={employeeById}
              onChange={row.onChange}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AssignmentRow({
  label,
  meta,
  alwaysOn,
  employeeIds,
  saving,
  options,
  employeeById,
  onChange,
}: {
  label: string
  meta?: string
  alwaysOn?: { employeeId: number; role: string }[]
  employeeIds: number[]
  saving: boolean
  options: { value: string; label: string; description?: string }[]
  employeeById: Map<number, PlatformEmployee>
  onChange: (employeeIds: number[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const hasAlways = Boolean(alwaysOn)
  const alwaysEmpty = hasAlways && (alwaysOn?.length ?? 0) === 0
  const hasExtras = employeeIds.length > 0

  return (
    <tr>
      <td className="pd-cal-calibrators-panel__cell-label">
        <span className="pd-cal-calibrators-panel__row-label">{label}</span>
        {meta ? (
          <span className="pd-cal-calibrators-panel__row-meta">{meta}</span>
        ) : null}
      </td>
      <td className="pd-cal-calibrators-panel__cell-calibrators">
        <div className="pd-cal-calibrators-panel__calibrators">
          {alwaysOn && alwaysOn.length > 0 ? (
            <ul className="pd-cal-calibrators-panel__chips">
              {alwaysOn.map((row) => {
                const employee = employeeById.get(row.employeeId)
                const name = employee?.fullName ?? String(row.employeeId)
                return (
                  <li key={`always:${row.employeeId}`}>
                    <span className="pd-cal-calibrators-panel__chip is-locked">
                      <Avatar name={name} src={employee?.avatarUrl} size="sm" />
                      <span className="pd-cal-calibrators-panel__chip-name">
                        {name}
                      </span>
                      <span className="pd-cal-calibrators-panel__chip-role">
                        {row.role}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : null}
          {alwaysEmpty ? (
            <p className="pd-cal-calibrators-panel__none">No Head Or HRBP Set</p>
          ) : null}
          <AssignedPeople
            employeeIds={employeeIds}
            employeeById={employeeById}
            saving={saving}
            hideEmpty={hasAlways}
            onRemove={(employeeId) =>
              onChange(employeeIds.filter((id) => id !== employeeId))
            }
          />
          {!hasAlways && !hasExtras ? (
            <p className="pd-cal-calibrators-panel__none">
              No Calibrators Assigned
            </p>
          ) : null}
          <div className="pd-cal-calibrators-panel__card-add">
            <button
              type="button"
              className={
                adding
                  ? 'pd-cal-calibrators-panel__add-btn is-open'
                  : 'pd-cal-calibrators-panel__add-btn'
              }
              disabled={saving}
              aria-label={`Add Calibrator For ${label}`}
              aria-expanded={adding}
              onClick={() => setAdding(true)}
            >
              <Plus size={16} strokeWidth={2} aria-hidden />
            </button>
            {adding ? (
              <ListboxSelect
                className="pd-cal-calibrators-panel__add-listbox"
                value=""
                allowEmpty={false}
                placeholder="Add Calibrator"
                searchable
                searchPlaceholder="Search People…"
                defaultOpen
                aria-label={`Add Calibrator For ${label}`}
                options={options}
                disabled={saving}
                onOpenChange={(open) => {
                  if (!open) setAdding(false)
                }}
                onValueChange={(value) => {
                  setAdding(false)
                  const employeeId = Number(value)
                  if (!Number.isInteger(employeeId) || employeeId <= 0) return
                  onChange([...employeeIds, employeeId])
                }}
              />
            ) : null}
          </div>
        </div>
      </td>
    </tr>
  )
}

function AssignedPeople({
  employeeIds,
  employeeById,
  saving,
  hideEmpty = false,
  onRemove,
}: {
  employeeIds: readonly number[]
  employeeById: Map<number, PlatformEmployee>
  saving: boolean
  hideEmpty?: boolean
  onRemove: (employeeId: number) => void
}) {
  if (employeeIds.length === 0) {
    return hideEmpty ? null : (
      <p className="pd-cal-calibrators-panel__none">No Calibrators Assigned</p>
    )
  }
  return (
    <ul className="pd-cal-calibrators-panel__chips">
      {employeeIds.map((employeeId) => {
        const employee = employeeById.get(employeeId)
        const name = employee?.fullName ?? String(employeeId)
        return (
          <li key={employeeId}>
            <span className="pd-cal-calibrators-panel__chip">
              <Avatar name={name} src={employee?.avatarUrl} size="sm" />
              <span className="pd-cal-calibrators-panel__chip-name">{name}</span>
              <button
                type="button"
                className="pd-cal-calibrators-panel__chip-remove"
                disabled={saving}
                aria-label={`Remove ${name}`}
                onClick={() => onRemove(employeeId)}
              >
                <X size={10} strokeWidth={2.25} aria-hidden />
              </button>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

import { useDeferredValue, useMemo, useState } from 'react'
import { X } from 'lucide-react'
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
  'A calibrator can change grades for one department, one team, or one person. Heads of department and HRBPs can always change grades in their department.'

export function DepartmentCalibratorsDialog({
  assignments,
  employees,
  onClose,
  onChange,
}: {
  assignments: CalibratorAssignments
  employees: readonly PlatformEmployee[]
  onClose: () => void
  onChange: (next: CalibratorAssignments) => void
}) {
  const [scope, setScope] = useState<Scope>('department')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [personId, setPersonId] = useState<number | null>(null)

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
        caught instanceof Error ? caught.message : 'Could not save calibrators.',
      )
    } finally {
      setSavingKey(null)
    }
  }

  function optionsFor(assigned: readonly number[], exceptId?: number) {
    const taken = new Set(assigned)
    return people
      .filter(
        (employee) =>
          employee.employeeId !== exceptId && !taken.has(employee.employeeId),
      )
      .map((employee) => ({
        value: String(employee.employeeId),
        label: employee.fullName,
        description: [employee.team, employee.department]
          .filter(Boolean)
          .join(' · '),
      }))
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
      label="Assign calibrators"
      closeLabel="Close assign calibrators"
      defaultWidth={520}
      onClose={onClose}
      title={
        <div className="pd-cal-drawer__title-block">
          <h2 className="pd-settings-panel__title">
            Assign calibrators
            <HintIcon content={PANEL_HINT} label="About calibrators" />
          </h2>
          <p className="pd-cal-drawer__title-meta">
            Changes save as you add or remove people.
          </p>
        </div>
      }
      subnav={
        <SegmentedControl
          aria-label="Calibrator scope"
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
              ? 'Search departments'
              : scope === 'team'
                ? 'Search teams'
                : 'Search people'
          }
          value={query}
          placeholder={
            scope === 'department'
              ? 'Filter departments'
              : scope === 'team'
                ? 'Filter teams'
                : 'Filter people with calibrators'
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
          <AssignmentList
            empty={
              deferredQuery
                ? 'No departments match.'
                : 'No departments yet.'
            }
            rows={departmentRows.map((department) => ({
              key: `department:${department.departmentId}`,
              title: department.department,
              meta:
                [
                  department.headEmployeeId
                    ? `Head: ${employeeById.get(department.headEmployeeId)?.fullName ?? department.headEmployeeId}`
                    : null,
                  department.hrbpEmployeeId
                    ? `HRBP: ${employeeById.get(department.hrbpEmployeeId)?.fullName ?? department.hrbpEmployeeId}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'No head or HRBP set',
              employeeIds: department.employeeIds,
              saving: savingKey === `department:${department.departmentId}`,
              options: optionsFor(department.employeeIds),
              onChange: (employeeIds) =>
                void save(`department:${department.departmentId}`, async () => {
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
                }),
            }))}
            employeeById={employeeById}
          />
        ) : null}

        {scope === 'team' ? (
          <AssignmentList
            empty={deferredQuery ? 'No teams match.' : 'No teams yet.'}
            rows={teamRows.map((team) => ({
              key: `team:${team.teamId}`,
              title: team.team,
              meta: team.department,
              employeeIds: team.employeeIds,
              saving: savingKey === `team:${team.teamId}`,
              options: optionsFor(team.employeeIds),
              onChange: (employeeIds) =>
                void save(`team:${team.teamId}`, async () => {
                  const next = await saveTeamCalibrators(team.teamId, employeeIds)
                  if (!next) return
                  onChange({
                    ...assignments,
                    teams: assignments.teams.map((row) =>
                      row.teamId === next.teamId ? next : row,
                    ),
                  })
                }),
            }))}
            employeeById={employeeById}
          />
        ) : null}

        {scope === 'person' ? (
          <div className="pd-cal-calibrators-panel__person">
            <ListboxSelect
              value={personId == null ? '' : String(personId)}
              allowEmpty
              emptyLabel="Choose a person"
              searchable
              aria-label="Person whose grade can be changed"
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
              <AssignmentCard
                title={
                  employeeById.get(personId)?.fullName ?? String(personId)
                }
                meta={
                  [
                    employeeById.get(personId)?.team,
                    employeeById.get(personId)?.department,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Person-specific calibrators'
                }
                employeeIds={selectedPerson?.employeeIds ?? []}
                saving={savingKey === `person:${personId}`}
                options={optionsFor(
                  selectedPerson?.employeeIds ?? [],
                  personId,
                )}
                employeeById={employeeById}
                onChange={(employeeIds) =>
                  void save(`person:${personId}`, async () => {
                    const next = await savePersonCalibrators(
                      personId,
                      employeeIds,
                    )
                    const peopleRows = assignments.people.filter(
                      (row) => row.subjectEmployeeId !== personId,
                    )
                    onChange({
                      ...assignments,
                      people: next ? [...peopleRows, next] : peopleRows,
                    })
                  })
                }
              />
            ) : (
              <p className="pd-cal-calibrators-panel__hint">
                Choose a person, then add who can change only their grade.
              </p>
            )}

            {existingPersonRows.length > 0 ? (
              <section
                className="pd-cal-calibrators-panel__existing"
                aria-label="People with calibrators"
              >
                <h3 className="pd-cal-calibrators-panel__existing-title">
                  Already assigned
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
                              ? '1 calibrator'
                              : `${row.employeeIds.length} calibrators`}
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

function AssignmentList({
  rows,
  empty,
  employeeById,
}: {
  rows: {
    key: string
    title: string
    meta: string
    employeeIds: number[]
    saving: boolean
    options: { value: string; label: string; description?: string }[]
    onChange: (employeeIds: number[]) => void
  }[]
  empty: string
  employeeById: Map<number, PlatformEmployee>
}) {
  if (rows.length === 0) {
    return <p className="pd-cal-calibrators-panel__empty">{empty}</p>
  }
  return (
    <ul className="pd-cal-calibrators-panel__list">
      {rows.map((row) => (
        <li key={row.key}>
          <AssignmentCard
            title={row.title}
            meta={row.meta}
            employeeIds={row.employeeIds}
            saving={row.saving}
            options={row.options}
            employeeById={employeeById}
            onChange={row.onChange}
          />
        </li>
      ))}
    </ul>
  )
}

function AssignmentCard({
  title,
  meta,
  employeeIds,
  saving,
  options,
  employeeById,
  onChange,
}: {
  title: string
  meta: string
  employeeIds: number[]
  saving: boolean
  options: { value: string; label: string; description?: string }[]
  employeeById: Map<number, PlatformEmployee>
  onChange: (employeeIds: number[]) => void
}) {
  return (
    <article className="pd-cal-calibrators-panel__card">
      <header className="pd-cal-calibrators-panel__card-head">
        <h3 className="pd-cal-calibrators-panel__card-title">{title}</h3>
        {meta ? (
          <p className="pd-cal-calibrators-panel__card-meta">{meta}</p>
        ) : null}
      </header>
      <AssignedPeople
        employeeIds={employeeIds}
        employeeById={employeeById}
        saving={saving}
        onRemove={(employeeId) =>
          onChange(employeeIds.filter((id) => id !== employeeId))
        }
      />
      <ListboxSelect
        value=""
        allowEmpty
        emptyLabel="Add calibrator"
        searchable
        aria-label={`Add calibrator for ${title}`}
        options={options}
        disabled={saving}
        onValueChange={(value) => {
          const employeeId = Number(value)
          if (!Number.isInteger(employeeId) || employeeId <= 0) return
          onChange([...employeeIds, employeeId])
        }}
      />
    </article>
  )
}

function AssignedPeople({
  employeeIds,
  employeeById,
  saving,
  onRemove,
}: {
  employeeIds: readonly number[]
  employeeById: Map<number, PlatformEmployee>
  saving: boolean
  onRemove: (employeeId: number) => void
}) {
  if (employeeIds.length === 0) {
    return (
      <p className="pd-cal-calibrators-panel__none">No calibrators assigned</p>
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
                <X size={12} strokeWidth={2.25} aria-hidden />
              </button>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

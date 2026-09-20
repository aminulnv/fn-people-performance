import { useMemo, useState } from 'react'
import { ListboxSelect, Modal, SegmentedControl } from '@/components/ui'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  saveDepartmentCalibrators,
  savePersonCalibrators,
  saveTeamCalibrators,
  type CalibratorAssignments,
  type PersonCalibratorAssignment,
} from '@/lib/calibration/sessionApi'

type Scope = 'department' | 'team' | 'person'

export function DepartmentCalibratorsDialog({
  open,
  assignments,
  employees,
  onClose,
  onChange,
}: {
  open: boolean
  assignments: CalibratorAssignments
  employees: readonly PlatformEmployee[]
  onClose: () => void
  onChange: (next: CalibratorAssignments) => void
}) {
  const [scope, setScope] = useState<Scope>('department')
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
  const nameById = useMemo(
    () => new Map(employees.map((employee) => [employee.employeeId, employee.fullName])),
    [employees],
  )

  async function save(
    key: string,
    run: () => Promise<void>,
  ) {
    setSavingKey(key)
    setError(null)
    try {
      await run()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save calibrators.')
    } finally {
      setSavingKey(null)
    }
  }

  function optionsFor(assigned: readonly number[], exceptId?: number) {
    const taken = new Set(assigned)
    return people
      .filter((employee) => employee.employeeId !== exceptId && !taken.has(employee.employeeId))
      .map((employee) => ({
        value: String(employee.employeeId),
        label: employee.fullName,
      }))
  }

  const selectedPerson = assignments.people.find(
    (row) => row.subjectEmployeeId === personId,
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign calibrators"
      description="A calibrator can change grades for one department, one team, or one person. Heads of department and HRBPs can always change grades in their department."
    >
      <SegmentedControl
        aria-label="Calibrator scope"
        value={scope}
        onChange={setScope}
        options={[
          { id: 'department', label: 'Department' },
          { id: 'team', label: 'Team' },
          { id: 'person', label: 'Person' },
        ]}
      />
      {error ? (
        <p className="pd-field__error" role="alert">
          {error}
        </p>
      ) : null}
      {scope === 'department' ? (
        <AssignmentList
          empty="No departments yet."
          rows={assignments.departments.map((department) => ({
            key: `department:${department.departmentId}`,
            title: department.department,
            meta:
              [
                department.headEmployeeId
                  ? `Head: ${nameById.get(department.headEmployeeId) ?? department.headEmployeeId}`
                  : null,
                department.hrbpEmployeeId
                  ? `HRBP: ${nameById.get(department.hrbpEmployeeId) ?? department.hrbpEmployeeId}`
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
          nameById={nameById}
        />
      ) : null}
      {scope === 'team' ? (
        <AssignmentList
          empty="No teams yet."
          rows={assignments.teams.map((team) => ({
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
          nameById={nameById}
        />
      ) : null}
      {scope === 'person' ? (
        <div className="pd-cal-calibrators">
          {assignments.people.length > 0 ? (
            <ul>
              {assignments.people.map((row) => (
                <li key={row.subjectEmployeeId}>
                  <button
                    type="button"
                    onClick={() => setPersonId(row.subjectEmployeeId)}
                  >
                    {nameById.get(row.subjectEmployeeId) ?? row.subjectEmployeeId}
                    {` · ${row.employeeIds.length} assigned`}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <ListboxSelect
            value={personId == null ? '' : String(personId)}
            allowEmpty
            emptyLabel="Choose a person"
            searchable
            aria-label="Person whose grade can be changed"
            options={people.map((employee) => ({
              value: String(employee.employeeId),
              label: employee.fullName,
              description: [employee.team, employee.department].filter(Boolean).join(' · '),
            }))}
            onValueChange={(value) => {
              const id = Number(value)
              setPersonId(Number.isInteger(id) && id > 0 ? id : null)
            }}
          />
          {personId == null ? (
            <p className="pd-cal-ind__empty">
              Choose a person, then add who can change only their grade.
            </p>
          ) : (
            <PersonEditor
              subjectEmployeeId={personId}
              assignment={selectedPerson}
              nameById={nameById}
              options={optionsFor(selectedPerson?.employeeIds ?? [], personId)}
              saving={savingKey === `person:${personId}`}
              onChange={(employeeIds) =>
                void save(`person:${personId}`, async () => {
                  const next = await savePersonCalibrators(personId, employeeIds)
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
          )}
        </div>
      ) : null}
    </Modal>
  )
}

function PersonEditor({
  subjectEmployeeId,
  assignment,
  nameById,
  options,
  saving,
  onChange,
}: {
  subjectEmployeeId: number
  assignment: PersonCalibratorAssignment | undefined
  nameById: Map<number, string>
  options: { value: string; label: string }[]
  saving: boolean
  onChange: (employeeIds: number[]) => void
}) {
  const employeeIds = assignment?.employeeIds ?? []
  return (
    <ul className="pd-cal-calibrators">
      <li>
        <h3>{nameById.get(subjectEmployeeId) ?? subjectEmployeeId}</h3>
        <AssignedPeople
          employeeIds={employeeIds}
          nameById={nameById}
          saving={saving}
          onRemove={(employeeId) =>
            onChange(employeeIds.filter((id) => id !== employeeId))
          }
        />
        <ListboxSelect
          value=""
          allowEmpty
          emptyLabel="Add calibrator"
          aria-label="Add a person-specific calibrator"
          options={options}
          disabled={saving}
          onValueChange={(value) => {
            const employeeId = Number(value)
            if (!Number.isInteger(employeeId) || employeeId <= 0) return
            onChange([...employeeIds, employeeId])
          }}
        />
      </li>
    </ul>
  )
}

function AssignmentList({
  rows,
  empty,
  nameById,
}: {
  rows: {
    key: string
    title: string
    meta: string
    employeeIds: number[]
    saving: boolean
    options: { value: string; label: string }[]
    onChange: (employeeIds: number[]) => void
  }[]
  empty: string
  nameById: Map<number, string>
}) {
  if (rows.length === 0) {
    return <p className="pd-cal-ind__empty">{empty}</p>
  }
  return (
    <ul className="pd-cal-calibrators">
      {rows.map((row) => (
        <li key={row.key}>
          <h3>{row.title}</h3>
          <p>{row.meta}</p>
          <AssignedPeople
            employeeIds={row.employeeIds}
            nameById={nameById}
            saving={row.saving}
            onRemove={(employeeId) =>
              row.onChange(row.employeeIds.filter((id) => id !== employeeId))
            }
          />
          <ListboxSelect
            value=""
            allowEmpty
            emptyLabel="Add calibrator"
            aria-label={`Add calibrator for ${row.title}`}
            options={row.options}
            disabled={row.saving}
            onValueChange={(value) => {
              const employeeId = Number(value)
              if (!Number.isInteger(employeeId) || employeeId <= 0) return
              row.onChange([...row.employeeIds, employeeId])
            }}
          />
        </li>
      ))}
    </ul>
  )
}

function AssignedPeople({
  employeeIds,
  nameById,
  saving,
  onRemove,
}: {
  employeeIds: readonly number[]
  nameById: Map<number, string>
  saving: boolean
  onRemove: (employeeId: number) => void
}) {
  if (employeeIds.length === 0) return null
  return (
    <ul>
      {employeeIds.map((employeeId) => (
        <li key={employeeId}>
          <span>{nameById.get(employeeId) ?? employeeId}</span>
          <button type="button" disabled={saving} onClick={() => onRemove(employeeId)}>
            Remove
          </button>
        </li>
      ))}
    </ul>
  )
}

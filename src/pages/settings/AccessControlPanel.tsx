import { useEffect, useMemo, useState } from 'react'
import { Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { Avatar, Button, ListboxSelect } from '@/components/ui'
import { ApiError } from '@/lib/apiClient'
import {
  assignEmployeeAccess,
  fetchAccessControl,
} from '@/lib/accessControl/api'
import {
  ACCESS_PROFILES,
  hasSystemPermission,
  type AccessControlSnapshot,
  type AccessProfileKey,
} from '@/lib/accessControl/types'
import { useEmployees } from '@/lib/employees/useEmployees'
import { useAuth } from '@/lib/useAuth'

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object') {
    const message = (error.body as { error?: unknown }).error
    if (typeof message === 'string') return message
  }
  return error instanceof Error ? error.message : 'Could not update access.'
}

export function AccessControlPanel() {
  const { user } = useAuth()
  const { employees, isLoading: employeesLoading } = useEmployees()
  const [snapshot, setSnapshot] = useState<AccessControlSnapshot | null>(null)
  const [employeeId, setEmployeeId] = useState('')
  const [profileKey, setProfileKey] =
    useState<AccessProfileKey>('admin_read')
  const [savingEmployeeId, setSavingEmployeeId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canManage = hasSystemPermission(user?.permissions, 'access.manage')

  useEffect(() => {
    let isMounted = true
    void fetchAccessControl()
      .then((next) => {
        if (isMounted) setSnapshot(next)
      })
      .catch((nextError) => {
        if (isMounted) setError(errorMessage(nextError))
      })
    return () => {
      isMounted = false
    }
  }, [])

  const assignments = useMemo(() => {
    if (!snapshot) return []
    const employeesById = new Map(
      employees.map((employee) => [employee.employeeId, employee]),
    )
    return snapshot.assignments
      .map((assignment) => ({
        assignment,
        employee: employeesById.get(assignment.employeeId),
      }))
      .filter((item) => item.employee)
      .sort((left, right) =>
        left.employee!.fullName.localeCompare(right.employee!.fullName),
      )
  }, [employees, snapshot])

  const assignedIds = new Set(
    snapshot?.assignments.map((assignment) => assignment.employeeId) ?? [],
  )
  const employeeOptions = employees
    .filter((employee) => employee.isActive && !assignedIds.has(employee.employeeId))
    .map((employee) => ({
      value: String(employee.employeeId),
      label: employee.fullName,
      description: employee.jobTitle || employee.department || employee.email,
      searchText: [
        employee.email,
        employee.department,
        employee.team,
      ].join(' '),
      leading: <Avatar name={employee.fullName} src={employee.avatarUrl} size="sm" />,
    }))

  const profileOptions = (snapshot?.profiles ?? ACCESS_PROFILES).map(
    (profile) => ({
      value: profile.key,
      label: profile.label,
      description: profile.description,
    }),
  )

  const updateAssignment = async (
    targetEmployeeId: number,
    nextProfileKey: AccessProfileKey | null,
  ) => {
    setSavingEmployeeId(targetEmployeeId)
    setError(null)
    try {
      const assignment = await assignEmployeeAccess(
        targetEmployeeId,
        nextProfileKey,
      )
      setSnapshot((current) => {
        if (!current) return current
        const remaining = current.assignments.filter(
          (item) => item.employeeId !== targetEmployeeId,
        )
        return {
          ...current,
          assignments: assignment ? [...remaining, assignment] : remaining,
        }
      })
      setEmployeeId('')
    } catch (nextError) {
      setError(errorMessage(nextError))
    } finally {
      setSavingEmployeeId(null)
    }
  }

  return (
    <section
      className="pd-settings-section pd-access"
      aria-labelledby="access-heading"
    >
      <div className="pd-settings-section__header">
        <div className="pd-access__heading">
          <span className="pd-access__heading-icon" aria-hidden>
            <ShieldCheck size={17} strokeWidth={2.25} />
          </span>
          <div>
            <h2 id="access-heading" className="pd-settings-section__title">
              Admin access
            </h2>
            <p className="pd-settings-section__hint">
              Assign platform-wide read or read + write access. Reporting-line
              permissions remain separate.
            </p>
          </div>
        </div>
      </div>

      {canManage ? (
        <div className="pd-access__add" aria-label="Assign admin access">
          <div className="pd-access__field pd-access__field--person">
            <span className="pd-access__label">Employee</span>
            <ListboxSelect
              value={employeeId}
              onValueChange={setEmployeeId}
              options={employeeOptions}
              placeholder="Choose an employee"
              searchable
              searchPlaceholder="Search employees…"
              aria-label="Employee"
            />
          </div>
          <div className="pd-access__field">
            <span className="pd-access__label">Access</span>
            <ListboxSelect
              value={profileKey}
              onValueChange={(value) =>
                setProfileKey(value as AccessProfileKey)
              }
              options={profileOptions}
              allowEmpty={false}
              aria-label="Admin access level"
            />
          </div>
          <Button
            size="sm"
            disabled={!employeeId}
            loading={savingEmployeeId === Number(employeeId)}
            onClick={() =>
              void updateAssignment(Number(employeeId), profileKey)
            }
          >
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            Add admin
          </Button>
        </div>
      ) : (
        <p className="pd-access__notice">
          You have read-only admin access. Only a read + write admin can change
          assignments.
        </p>
      )}

      {error ? (
        <p className="pd-access__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="pd-access__list" aria-busy={!snapshot || employeesLoading}>
        <div className="pd-access__list-head" aria-hidden>
          <span>Admin</span>
          <span>Access</span>
          <span />
        </div>
        {snapshot && assignments.length === 0 ? (
          <p className="pd-access__empty">No persistent admins assigned yet.</p>
        ) : null}
        {assignments.map(({ assignment, employee }) => (
          <div className="pd-access__row" key={assignment.employeeId}>
            <div className="pd-access__person">
              <Avatar
                name={employee!.fullName}
                src={employee!.avatarUrl}
                size="sm"
              />
              <div className="pd-access__person-copy">
                <strong>{employee!.fullName}</strong>
                <span>
                  {employee!.jobTitle || employee!.department || employee!.email}
                </span>
              </div>
            </div>
            <ListboxSelect
              value={assignment.profileKey}
              onValueChange={(value) =>
                void updateAssignment(
                  assignment.employeeId,
                  value as AccessProfileKey,
                )
              }
              options={profileOptions}
              allowEmpty={false}
              disabled={!canManage || savingEmployeeId === assignment.employeeId}
              aria-label={`Access for ${employee!.fullName}`}
            />
            <button
              type="button"
              className="pd-access__remove"
              aria-label={`Remove admin access from ${employee!.fullName}`}
              disabled={!canManage || savingEmployeeId === assignment.employeeId}
              onClick={() =>
                void updateAssignment(assignment.employeeId, null)
              }
            >
              <Trash2 size={15} strokeWidth={1.8} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

import { useMemo } from 'react'
import { PageStatus, PageStatusRetry } from '@/components/ui'
import {
  resolveDepartmentHead,
  resolveHrbp,
} from '@/lib/employees/relationships'
import { useEmployeeProfile } from '@/lib/employees/useEmployeeProfile'
import { useEmployees } from '@/lib/employees/useEmployees'
import type { PlatformEmployee } from '@/lib/employees/types'
import { GoalCreateDrawer } from '@/pages/goals/GoalCreateDrawer'
import {
  EmployeeProfileView,
  resolveManager,
} from '@/pages/EmployeeProfilePage'
import '@/styles/layout-goals.css'
import '@/styles/layout-people.css'

function personFromDirectory(
  employeeId: number | null,
  people: PlatformEmployee[],
): PlatformEmployee | null {
  if (employeeId == null) return null
  return people.find((person) => person.employeeId === employeeId) ?? null
}

export function PeopleProfileDrawer({
  employeeId,
  onClose,
}: {
  employeeId: number
  onClose: () => void
}) {
  const { employees } = useEmployees({ load: false })
  const { employee: loaded, isLoading, loadError, reload } = useEmployeeProfile({
    employeeId,
  })
  const employee =
    loaded ?? personFromDirectory(employeeId, employees)

  const manager = useMemo(() => {
    const resolved = resolveManager(employee)
    if (resolved) return resolved
    return personFromDirectory(employee?.reportsToId ?? null, employees)
  }, [employee, employees])
  const departmentHead = useMemo(
    () => resolveDepartmentHead(employee),
    [employee],
  )
  const hrbp = useMemo(() => resolveHrbp(employee), [employee])

  return (
    <GoalCreateDrawer
      label={employee?.fullName || 'Employee profile'}
      closeLabel="Close Profile"
      onClose={onClose}
    >
      {!employee && isLoading ? (
        <PageStatus
          variant="loading"
          pageClassName="pd-people pd-profile pd-profile--embedded"
          aria-label="Loading employee"
          description="Fetching employee details…"
        />
      ) : !employee && loadError ? (
        <PageStatus
          variant="error"
          pageClassName="pd-people pd-profile pd-profile--embedded"
          aria-label="Employee load error"
          description={loadError || 'Failed to load this person.'}
          action={
            <PageStatusRetry onClick={() => void reload().catch(() => {})} />
          }
        />
      ) : !employee ? (
        <PageStatus
          variant="not-found"
          pageClassName="pd-people pd-profile pd-profile--embedded"
          aria-label="Employee not found"
          title="Employee not found"
          description="This person may have been removed or the link is outdated."
        />
      ) : (
        <EmployeeProfileView
          employee={employee}
          manager={manager}
          departmentHead={departmentHead}
          hrbp={hrbp}
          embedded
          fullViewHref={`/people/${employee.employeeId}`}
        />
      )}
    </GoalCreateDrawer>
  )
}

export default PeopleProfileDrawer

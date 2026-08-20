import { useMemo } from 'react'
import { PageStatus, PageStatusLink, PageStatusRetry } from '@/components/ui'
import {
  findEmployeeByEmail,
  getEmployee,
} from '@/lib/employees/store'
import { useEmployees } from '@/lib/employees/useEmployees'
import { useAuth } from '@/lib/useAuth'
import {
  resolveDepartmentHead,
  resolveHrbp,
} from '@/lib/employees/relationships'
import {
  EmployeeProfileView,
  resolveManager,
} from '@/pages/EmployeeProfilePage'
import '@/styles/layout-people.css'

export default function MyProfilePage() {
  const { user } = useAuth()
  const { employees, isLoading, loadError, reload } = useEmployees()

  const employee = useMemo(() => {
    if (!user) return null
    const employeeId = Number(user.personId)
    return (
      (Number.isFinite(employeeId) && employeeId > 0
        ? getEmployee(employeeId)
        : null) ?? findEmployeeByEmail(user.email)
    )
  }, [user, employees])

  const manager = useMemo(() => resolveManager(employee), [employee])
  const departmentHead = useMemo(
    () => resolveDepartmentHead(employee),
    [employee],
  )
  const hrbp = useMemo(() => resolveHrbp(employee), [employee])

  if (!user) {
    return null
  }

  if (!employee && isLoading) {
    return (
      <PageStatus
        variant="loading"
        pageClassName="pd-people pd-profile"
        aria-label="My profile"
        description="Loading your profile…"
      />
    )
  }

  if (!employee && loadError) {
    return (
      <PageStatus
        variant="error"
        pageClassName="pd-people pd-profile"
        aria-label="My profile load error"
        description={loadError || 'Failed to load your directory profile.'}
        action={
          <PageStatusRetry onClick={() => void reload().catch(() => {})} />
        }
      />
    )
  }

  if (!employee) {
    return (
      <PageStatus
        variant="info"
        pageClassName="pd-people pd-profile"
        aria-label="My profile"
        title="Profile not linked"
        description="Your account is not linked to a directory profile yet."
        action={<PageStatusLink to="/people" label="Browse People" />}
      />
    )
  }

  return (
    <EmployeeProfileView
      employee={employee}
      manager={manager}
      departmentHead={departmentHead}
      hrbp={hrbp}
      isSelf
    />
  )
}

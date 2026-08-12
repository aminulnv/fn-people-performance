import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  findEmployeeByEmail,
  getEmployee,
} from '@/lib/employees/store'
import { useEmployees } from '@/lib/employees/useEmployees'
import { useAuth } from '@/lib/useAuth'
import {
  EmployeeProfileView,
  resolveManager,
} from '@/pages/EmployeeProfilePage'
import '@/styles/layout-people.css'

export default function MyProfilePage() {
  const { user } = useAuth()
  const { employees, isLoading } = useEmployees()

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

  if (!user) {
    return null
  }

  if (isLoading) {
    return (
      <div
        className="pd-page pd-people pd-profile"
        aria-busy="true"
        aria-label="My profile"
      />
    )
  }

  if (!employee) {
    return (
      <div className="pd-page pd-people pd-profile" aria-label="My profile">
        <p className="pd-people__empty">
          Your account is not linked to a directory profile yet.
        </p>
        <Link to="/people" className="pd-people__back">
          Browse people
        </Link>
      </div>
    )
  }

  return (
    <EmployeeProfileView employee={employee} manager={manager} isSelf />
  )
}

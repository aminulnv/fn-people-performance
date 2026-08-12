import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  findEmployeeByEmail,
  getEmployee,
  loadEmployees,
  subscribeEmployeesStore,
} from '@/lib/employees/store'
import { useAuth } from '@/lib/useAuth'
import {
  EmployeeProfileView,
  resolveManager,
} from '@/pages/EmployeeProfilePage'
import '@/styles/layout-people.css'

export default function MyProfilePage() {
  const { user } = useAuth()
  const [tick, setTick] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void loadEmployees()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return subscribeEmployeesStore(() => setTick((n) => n + 1))
  }, [])

  const employee = useMemo(() => {
    void tick
    if (!user) return null
    const employeeId = Number(user.personId)
    return (
      (Number.isFinite(employeeId) && employeeId > 0
        ? getEmployee(employeeId)
        : null) ?? findEmployeeByEmail(user.email)
    )
  }, [user, tick])

  const manager = useMemo(() => {
    void tick
    return resolveManager(employee)
  }, [employee, tick])

  if (!user) {
    return null
  }

  if (!ready) {
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

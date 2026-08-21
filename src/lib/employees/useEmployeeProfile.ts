import { useEffect, useMemo, useState } from 'react'
import {
  findEmployeeByEmail,
  getEmployee,
  loadEmployeeProfile,
} from './store'
import { useEmployees } from './useEmployees'
import type { PlatformEmployee } from './types'

export function useEmployeeProfile(lookup: {
  employeeId?: number | null
  email?: string | null
}): {
  employee: PlatformEmployee | null
  isLoading: boolean
  loadError: string | null
  reload: () => Promise<void>
} {
  const { employees, isLoading: directoryLoading, loadError, reload } =
    useEmployees({ load: false })
  const [profileLoading, setProfileLoading] = useState(false)
  const employeeId = lookup.employeeId ?? null

  const employee = useMemo(() => {
    if (employeeId != null && Number.isInteger(employeeId) && employeeId > 0) {
      const byId =
        getEmployee(employeeId) ??
        employees.find((person) => person.employeeId === employeeId)
      if (byId) return byId
    }
    if (lookup.email) return findEmployeeByEmail(lookup.email)
    return null
  }, [employeeId, lookup.email, employees])

  useEffect(() => {
    if (employeeId == null || !Number.isInteger(employeeId) || employeeId <= 0) {
      return
    }
    if (
      getEmployee(employeeId) ||
      employees.some((person) => person.employeeId === employeeId)
    ) {
      return
    }

    let cancelled = false
    setProfileLoading(true)
    void loadEmployeeProfile(employeeId)
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setProfileLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [employeeId, employees])

  return {
    employee,
    isLoading: !employee && (directoryLoading || profileLoading),
    loadError,
    reload,
  }
}

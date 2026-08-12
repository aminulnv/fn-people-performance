import { useEffect, useState } from 'react'
import { avatarHue } from '@/lib/employees/avatar'
import {
  findEmployeeByEmail,
  getEmployee,
} from '@/lib/employees/store'
import { useEmployees } from '@/lib/employees/useEmployees'
import { employeeToDemoPerson } from '@/lib/goals/peopleFromEmployees'
import {
  getGoalsSnapshot,
  subscribeGoalsStore,
} from '@/lib/goals/store'
import type { DemoPerson } from '@/lib/goals/types'
import { useAuth } from '@/lib/useAuth'

/** Logged-in person from auth, enriched with directory / goals profile when available. */
export function useCurrentPerson(): DemoPerson | null {
  const { user } = useAuth()
  const { employees } = useEmployees({ load: false })
  const [goalsTick, setGoalsTick] = useState(0)

  useEffect(() => subscribeGoalsStore(() => setGoalsTick((n) => n + 1)), [])
  void goalsTick

  if (!user) return null

  const employeeId = Number(user.personId)
  const fromDirectory =
    (Number.isFinite(employeeId)
      ? getEmployee(employeeId)
      : null) ?? findEmployeeByEmail(user.email)

  if (fromDirectory) {
    return employeeToDemoPerson(fromDirectory, employees)
  }

  const fromGoals = getGoalsSnapshot().people.find(
    (p) => p.id === user.personId || p.email === user.email,
  )
  if (fromGoals) return fromGoals

  return {
    id: user.personId,
    name: user.name,
    email: user.email,
    title: user.title,
    department: '',
    role: user.role,
    joinDate: '2020-01-01',
    reportIds: [],
    avatarHue: avatarHue(user.email || user.personId),
    blurb: '',
  }
}

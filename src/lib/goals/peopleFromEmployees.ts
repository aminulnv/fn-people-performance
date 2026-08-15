import { avatarHue } from '@/lib/employees/avatar'
import { listEmployees } from '@/lib/employees/store'
import type { PlatformEmployee } from '@/lib/employees/types'
import { buildDemoPersonGoals, demoSeedStatus } from './demoGoals'
import type { DemoPerson, GoalRole, PersonGoals } from './types'

function inferGoalRole(
  employee: PlatformEmployee,
  reportCount: number,
): GoalRole {
  const title = employee.jobTitle.trim().toLowerCase()
  if (title.includes('hr business partner') || title === 'hrbp') {
    return 'hrbp'
  }
  if (/\bptr\b/.test(title) || title.includes('people technology')) {
    return 'ptr'
  }
  if (title.includes('senior manager') || title.includes('head of')) {
    return 'seniormanager'
  }
  if (
    reportCount > 0 ||
    title.includes('manager') ||
    title.includes('director') ||
    title.includes('team lead')
  ) {
    return title.includes('senior') ? 'seniormanager' : 'manager'
  }
  return 'employee'
}

export function employeeToDemoPerson(
  employee: PlatformEmployee,
  directory: PlatformEmployee[],
): DemoPerson {
  const id = String(employee.employeeId)
  const reportIds = directory
    .filter((other) => other.reportsToId === employee.employeeId)
    .map((other) => String(other.employeeId))

  return {
    id,
    name: employee.fullName,
    email: employee.email,
    title: employee.jobTitle,
    department: employee.department,
    role: inferGoalRole(employee, reportIds.length),
    joinDate: employee.startDate,
    managerId:
      employee.reportsToId != null ? String(employee.reportsToId) : undefined,
    reportIds,
    avatarHue: avatarHue(employee.email || id),
    avatarUrl: employee.avatarUrl || undefined,
    blurb: '',
  }
}

export function peopleFromEmployees(): DemoPerson[] {
  const directory = listEmployees().filter((e) => e.isActive)
  return directory
    .map((employee) => employeeToDemoPerson(employee, directory))
    .sort((a, b) => {
      const aDept = a.department.trim()
      const bDept = b.department.trim()
      const aBlank = aDept === ''
      const bBlank = bDept === ''
      if (aBlank !== bBlank) return aBlank ? 1 : -1
      const byDept = aDept.localeCompare(bDept, undefined, {
        sensitivity: 'base',
      })
      if (byDept !== 0) return byDept
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
}

export function emptyPersonGoals(personId: string): PersonGoals {
  return {
    personId,
    status: 'draft',
    goals: [],
  }
}

/** Merge directory people into goals state; keep existing goal rows when ids match. */
export function mergePeopleIntoGoalsState(input: {
  cycleId: string
  byPerson: Record<string, PersonGoals>
  activePersonId: string
  /** Seeded in draft so goal setting stays demoable; others vary pending/approved. */
  signedInPersonId?: string
}): {
  people: DemoPerson[]
  byPerson: Record<string, PersonGoals>
  activePersonId: string
} {
  const people = peopleFromEmployees()
  const byPerson: Record<string, PersonGoals> = {}

  for (const person of people) {
    byPerson[person.id] =
      input.byPerson[person.id] ??
      buildDemoPersonGoals(
        input.cycleId,
        person.id,
        demoSeedStatus(person.id, input.signedInPersonId, person.managerId),
      )
  }

  const activeStillPresent = people.some((p) => p.id === input.activePersonId)
  const activePersonId = activeStillPresent
    ? input.activePersonId
    : (people[0]?.id ?? '')

  return { people, byPerson, activePersonId }
}

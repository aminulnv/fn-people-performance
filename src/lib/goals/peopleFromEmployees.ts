import { avatarHue } from '@/lib/employees/avatar'
import { listEmployees } from '@/lib/employees/store'
import type { PlatformEmployee } from '@/lib/employees/types'
import { normalizePersonGoals } from './classification'
import { buildDemoPersonGoals, demoSeedStatus } from './demoGoals'
import type { DemoPerson, PersonGoals } from './types'

function reportIdsFor(
  employee: PlatformEmployee,
  directory: PlatformEmployee[],
): string[] {
  return directory
    .filter((other) => other.reportsToId === employee.employeeId)
    .map((other) => String(other.employeeId))
}

export function employeeToDemoPerson(
  employee: PlatformEmployee,
  directory: PlatformEmployee[],
  reportIds = reportIdsFor(employee, directory),
): DemoPerson {
  const id = String(employee.employeeId)

  return {
    id,
    name: employee.fullName,
    email: employee.email,
    title: employee.jobTitle,
    department: employee.department,
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
  const reportsByManagerId = new Map<number, string[]>()
  for (const employee of directory) {
    const managerId = employee.reportsToId
    if (managerId == null) continue
    const reportId = String(employee.employeeId)
    const reports = reportsByManagerId.get(managerId)
    if (reports) reports.push(reportId)
    else reportsByManagerId.set(managerId, [reportId])
  }
  return directory
    .map((employee) =>
      employeeToDemoPerson(
        employee,
        directory,
        reportsByManagerId.get(employee.employeeId) ?? [],
      ),
    )
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
  const peopleById = new Map(people.map((person) => [person.id, person]))
  const byPerson: Record<string, PersonGoals> = {}

  for (const person of people) {
    const status = demoSeedStatus(
      person.id,
      input.signedInPersonId,
      person.managerId,
    )
    const manager = person.managerId
      ? peopleById.get(person.managerId)
      : undefined
    byPerson[person.id] = normalizePersonGoals(
      input.byPerson[person.id] ??
        buildDemoPersonGoals(
          input.cycleId,
          person.id,
          status,
          manager
            ? {
                id: manager.id,
                name: manager.name,
                avatarUrl: manager.avatarUrl,
              }
            : undefined,
        ),
    )
  }

  const activeStillPresent = people.some((p) => p.id === input.activePersonId)
  const activePersonId = activeStillPresent
    ? input.activePersonId
    : (people[0]?.id ?? '')

  return { people, byPerson, activePersonId }
}

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearEmployees, createEmployee } from '@/lib/employees/store'
import { mergePeopleIntoGoalsState } from './peopleFromEmployees'

async function seedInactiveEmployee() {
  const result = await createEmployee({
    employeeId: 7,
    fullName: 'Former Employee',
    email: 'former@example.com',
    startDate: '2020-01-01',
    jobTitle: 'Engineer',
    department: 'Product',
    team: '',
    division: '',
    reportsToName: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: '',
    site: '',
    managerEmail: '',
    isActive: false,
  })
  if (!result.ok) throw new Error(result.error)
}

describe('inactive employees in goals', () => {
  beforeEach(async () => {
    clearEmployees()
    await seedInactiveEmployee()
  })

  afterEach(() => {
    clearEmployees()
  })

  it('keeps an inactive employee when the cycle has historical goal data', () => {
    const projected = mergePeopleIntoGoalsState({
      cycleId: 'q2-2026',
      activePersonId: '7',
      seedMissingPeople: false,
      byPerson: {
        '7': {
          personId: '7',
          status: 'approved',
          goals: [],
          version: 1,
        },
      },
    })

    expect(projected.people.map((person) => person.id)).toContain('7')
  })

  it('keeps inactive employees out of active goal-setting lists', () => {
    const projected = mergePeopleIntoGoalsState({
      cycleId: 'q3-2026',
      activePersonId: '',
      seedMissingPeople: false,
      byPerson: {},
    })

    expect(projected.people).toHaveLength(0)
  })
})

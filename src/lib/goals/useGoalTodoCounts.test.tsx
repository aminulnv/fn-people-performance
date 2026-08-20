import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { clearSession, writeSession } from '@/lib/authApi'
import { clearEmployees, createEmployee } from '@/lib/employees/store'
import { countGoalTodosForPerson } from '@/lib/goals/todoCounts'
import { getGoalsSnapshot, resetGoalsDemo, setSignedInPerson } from '@/lib/goals/store'
import { useGoalTodoCounts } from './useGoalTodoCounts'

const MANAGER_ID = '2'

async function seedDirectory() {
  const rows = [
    {
      employeeId: 2,
      fullName: 'Line Manager',
      email: 'manager@example.com',
      startDate: '2024-01-01',
      jobTitle: 'Manager',
      managerEmail: '',
      reportsToName: '',
    },
    {
      employeeId: 1,
      fullName: 'Direct Report',
      email: 'report@example.com',
      startDate: '2024-01-01',
      jobTitle: 'Executive',
      managerEmail: 'manager@example.com',
      reportsToName: 'Line Manager',
    },
  ]

  for (const row of rows) {
    const created = await createEmployee({
      department: 'People',
      team: '',
      division: '',
      departmentHeadName: '',
      hrbpName: '',
      jobGrade: '',
      site: '',
      ...row,
    })
    if (!created.ok) throw new Error(created.error)
  }
}

function signInManager() {
  writeSession({
    user: {
      id: MANAGER_ID,
      email: 'manager@example.com',
      name: 'Line Manager',
      personId: MANAGER_ID,
      permissions: [],
      title: 'Manager',
    },
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('useGoalTodoCounts', () => {
  beforeEach(async () => {
    localStorage.clear()
    sessionStorage.clear()
    clearSession()
    clearEmployees()
    await seedDirectory()
    setSignedInPerson(MANAGER_ID)
    resetGoalsDemo()
    signInManager()
  })

  afterEach(() => {
    clearEmployees()
    clearSession()
  })

  it('matches own warnings plus reports awaiting approval', async () => {
    const snapshot = getGoalsSnapshot()
    const manager = snapshot.people.find((person) => person.id === MANAGER_ID)
    expect(manager).toBeTruthy()
    const expected = countGoalTodosForPerson(manager!, snapshot)

    const { result } = renderHook(() => useGoalTodoCounts(), { wrapper })

    await waitFor(() => {
      expect(result.current).toEqual({
        ...expected,
        total: expected.own + expected.reports,
      })
    })
  })
})

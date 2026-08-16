import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { clearSession, writeSession } from '@/lib/authApi'
import { clearEmployees, createEmployee } from '@/lib/employees/store'
import { resetGoalsDemo, setSignedInPerson } from '@/lib/goals/store'
import { useGoalsController } from './useGoalsController'

const MANAGER_ID = '2'
const REPORT_ID = '1'
const PEER_ID = '3'

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
    {
      employeeId: 3,
      fullName: 'Second Report',
      email: 'peer@example.com',
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

/** Signs in the manager, who has two direct reports. */
function signInManager() {
  writeSession({
    user: {
      id: MANAGER_ID,
      email: 'manager@example.com',
      name: 'Line Manager',
      personId: MANAGER_ID,
      title: 'Manager',
    },
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

function renderController(subjectId: string) {
  return renderHook(() => useGoalsController({ subjectId }), { wrapper })
}

describe('useGoalsController reports', () => {
  beforeEach(async () => {
    localStorage.clear()
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

  it('lists the direct reports of the person being viewed', async () => {
    const { result } = renderController(MANAGER_ID)

    await waitFor(() => {
      expect(result.current.subject?.id).toBe(MANAGER_ID)
    })
    await waitFor(() => {
      expect(result.current.reports.map((item) => item.person.id).sort()).toEqual(
        [PEER_ID, REPORT_ID].sort(),
      )
    })
  })

  it('lists no reports on the profile of someone who manages nobody', async () => {
    const { result } = renderController(REPORT_ID)

    await waitFor(() => {
      expect(result.current.subject?.id).toBe(REPORT_ID)
    })
    expect(result.current.reports).toEqual([])
  })
})

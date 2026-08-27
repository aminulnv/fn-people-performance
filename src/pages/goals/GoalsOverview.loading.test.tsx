import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/lib/AuthProvider'
import { clearSession, writeSession } from '@/lib/authApi'
import { clearEmployees, createEmployee } from '@/lib/employees/store'
import {
  getGoalsSnapshot,
  mergeRemotePersonGoals,
  resetGoalsDemo,
  setSignedInPerson,
} from '@/lib/goals/store'
import { resetSharedGoalsSnapshotForTests } from '@/lib/goals/useSharedGoalsSnapshot'
import {
  createCycleGroup,
  getReviewCycle,
  resetReviewsStoreForTests,
} from '@/lib/reviews/store'
import GoalsPage from '@/pages/GoalsPage'

vi.mock('@/lib/goals/useSharedGoalsSnapshot', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/goals/useSharedGoalsSnapshot')>()
  return {
    ...actual,
    useGoalsHydration: () => ({ ownReady: false, cycleReady: false }),
  }
})

const REPORT_ID = '1'

async function seedDirectory() {
  const created = await createEmployee({
    employeeId: 1,
    fullName: 'Direct Report',
    email: 'report@example.com',
    startDate: '2024-01-01',
    jobTitle: 'Executive',
    managerEmail: '',
    reportsToName: '',
    department: 'People',
    team: '',
    division: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: '',
    site: '',
  })
  if (!created.ok) throw new Error(created.error)
}

describe('Goals overview loading', () => {
  beforeEach(async () => {
    localStorage.clear()
    sessionStorage.clear()
    clearSession()
    clearEmployees()
    resetReviewsStoreForTests()
    resetSharedGoalsSnapshotForTests()
    await seedDirectory()
    setSignedInPerson(REPORT_ID)
    resetGoalsDemo()
    const cycle = getReviewCycle(getGoalsSnapshot().cycle.id)
    if (!cycle) throw new Error('Expected the active cycle')
    await createCycleGroup(cycle.id, {
      name: 'Everyone',
      memberIds: [1],
    })
    mergeRemotePersonGoals(cycle.id, REPORT_ID, {
      personId: REPORT_ID,
      status: 'draft',
      goals: [],
      version: 0,
    })
    writeSession({
      user: {
        id: REPORT_ID,
        email: 'report@example.com',
        name: 'Direct Report',
        personId: REPORT_ID,
        permissions: [],
        title: 'Executive',
      },
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
  })

  afterEach(() => {
    cleanup()
    resetSharedGoalsSnapshotForTests()
    clearEmployees()
    clearSession()
  })

  it('shows a loading surface instead of “No Goals Yet”', () => {
    render(
      <MemoryRouter initialEntries={['/goals#my-goals']}>
        <AuthProvider>
          <GoalsPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Loading goals')).toBeInTheDocument()
    expect(screen.queryByText('No Goals Yet')).not.toBeInTheDocument()
  })
})

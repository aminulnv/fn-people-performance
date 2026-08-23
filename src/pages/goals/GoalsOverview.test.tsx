import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/lib/AuthProvider'
import { clearSession, writeSession } from '@/lib/authApi'
import { clearEmployees, createEmployee } from '@/lib/employees/store'
import {
  getGoalsSnapshot,
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

const REPORT_ID = '1'
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

async function putPeopleInGroup(memberIds: number[]) {
  const cycle = getReviewCycle(getGoalsSnapshot().cycle.id)
  if (!cycle) throw new Error('Expected the active cycle')
  return createCycleGroup(cycle.id, {
    name: 'Everyone',
    memberIds,
  })
}

function signInReport() {
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
}

function renderOverview() {
  return render(
    <MemoryRouter initialEntries={['/goals#my-goals']}>
      <AuthProvider>
        <GoalsPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Goals overview cycle eligibility', () => {
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
    signInReport()
  })

  afterEach(() => {
    cleanup()
    resetSharedGoalsSnapshotForTests()
    clearEmployees()
    clearSession()
  })

  it('explains leftover own goals when the viewer is outside the cycle', async () => {
    await putPeopleInGroup([2])
    const leftover = getGoalsSnapshot().byPerson[REPORT_ID]?.goals[0]
    expect(leftover).toBeTruthy()

    renderOverview()

    expect(
      await screen.findByRole('status', {
        name: /Not in this cycle\. Direct Report is not assigned to a review group for this cycle\./,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(leftover.description)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /add goal/i }),
    ).not.toBeInTheDocument()
  })

  it('still lists own goals when the viewer is in the cycle', async () => {
    await putPeopleInGroup([1, 2])
    const ownGoal = getGoalsSnapshot().byPerson[REPORT_ID]?.goals[0]
    expect(ownGoal).toBeTruthy()

    renderOverview()

    await waitFor(() => {
      expect(screen.getByText(ownGoal.description)).toBeInTheDocument()
    })
    expect(
      screen.queryByRole('status', { name: /Not in this cycle/ }),
    ).not.toBeInTheDocument()
  })
})

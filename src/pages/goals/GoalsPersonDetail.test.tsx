import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from '@/lib/AuthProvider'
import { clearSession, writeSession } from '@/lib/authApi'
import { clearEmployees, createEmployee } from '@/lib/employees/store'
import {
  getGoalsSnapshot,
  resetGoalsDemo,
  setActivePerson,
  setSignedInPerson,
} from '@/lib/goals/store'
import {
  createCycleGroup,
  getReviewCycle,
  resetReviewsStoreForTests,
} from '@/lib/reviews/store'
import { GoalsPersonDetail } from '@/pages/GoalsPage'
import GoalsPage from '@/pages/GoalsPage'

const MANAGER_ID = '2'
const REPORT_ID = '1'

async function seedDirectory(reportStartDate = '2024-01-01') {
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
      startDate: reportStartDate,
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

function LocationReadout() {
  const location = useLocation()
  return (
    <p>{`${location.pathname}${location.search}${location.hash}`}</p>
  )
}

function renderReportGoals() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <GoalsPersonDetail personId={REPORT_ID} embedded />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('GoalsPersonDetail manager review', () => {
  beforeEach(async () => {
    localStorage.clear()
    sessionStorage.clear()
    clearSession()
    clearEmployees()
    resetReviewsStoreForTests()
    await seedDirectory()
    setSignedInPerson(MANAGER_ID)
    resetGoalsDemo()
    await putPeopleInGroup([1, 2])
    signInManager()
  })

  afterEach(() => {
    cleanup()
    clearEmployees()
    clearSession()
  })

  it('does not rewrite the People directory hash when embedded', async () => {
    render(
      <MemoryRouter initialEntries={['/people?employee=1#everyone']}>
        <AuthProvider>
          <GoalsPersonDetail personId={REPORT_ID} embedded />
          <LocationReadout />
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('region', { name: 'Direct Report goals' }),
      ).toBeInTheDocument()
    })
    expect(screen.getByText('/people?employee=1#everyone')).toBeInTheDocument()
  })

  it('nests the report goals under the same review card as My Reports', async () => {
    renderReportGoals()

    await waitFor(() => {
      expect(
        screen.getByRole('region', { name: 'Direct Report goals' }),
      ).toBeInTheDocument()
    })
    const card = screen.getByRole('region', { name: 'Direct Report goals' })
    expect(card).toHaveTextContent(/awaiting your approval/)
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Back' })).toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: 'Approval' }),
    ).not.toBeInTheDocument()
  })

  it('opens the specific goal on the full view page from a deep link', async () => {
    const snapshot = getGoalsSnapshot()
    const goal = snapshot.byPerson[REPORT_ID]?.goals[0]
    expect(goal).toBeTruthy()

    render(
      <MemoryRouter
        initialEntries={[
          `/goals/${snapshot.cycle.id}/${REPORT_ID}/${goal.id}`,
        ]}
      >
        <AuthProvider>
          <Routes>
            <Route
              path="/goals/:cycleId/:personId/:goalId?"
              element={<GoalsPage />}
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByText(goal.description).length).toBeGreaterThan(0)
    })
  })
})

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

describe('GoalsPersonDetail submission status', () => {
  beforeEach(async () => {
    localStorage.clear()
    sessionStorage.clear()
    clearSession()
    clearEmployees()
    resetReviewsStoreForTests()
    await seedDirectory()
    setSignedInPerson(REPORT_ID)
    resetGoalsDemo()
    await putPeopleInGroup([1, 2])
    signInReport()
  })

  afterEach(() => {
    cleanup()
    clearEmployees()
    clearSession()
  })

  it('keeps draft status in the summary instead of a banner', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={REPORT_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('group', { name: /goal totals/i }),
      ).toHaveTextContent('Draft')
    })
    expect(document.querySelector('.pd-goal-view__approval')).toBeNull()
    expect(screen.queryByText('Not submitted yet')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: 'Approval' }),
    ).not.toBeInTheDocument()
  })

  it('expands nested measures from the goal row arrow', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={REPORT_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    const expand = await screen.findByRole('button', {
      name: 'Expand Improve delivery quality and close critical defects faster',
    })
    expect(expand).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Defects closed')).not.toBeInTheDocument()

    fireEvent.click(expand)

    expect(
      screen.getByRole('button', {
        name: 'Collapse Improve delivery quality and close critical defects faster',
      }),
    ).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Defects closed')).toBeInTheDocument()
  })
})

describe('GoalsPersonDetail cycle eligibility', () => {
  beforeEach(async () => {
    localStorage.clear()
    sessionStorage.clear()
    clearSession()
    clearEmployees()
    resetReviewsStoreForTests()
    await seedDirectory()
    setSignedInPerson(REPORT_ID)
    resetGoalsDemo()
    signInReport()
  })

  afterEach(() => {
    cleanup()
    clearEmployees()
    clearSession()
  })

  it('does not say they joined after Day 1 when they were left out of the cycle groups', async () => {
    await putPeopleInGroup([2])
    setActivePerson(REPORT_ID)

    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={REPORT_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Not in this cycle' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Direct Report is not assigned to a review group for this cycle.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/joined after Day 1/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: /goal totals/i }),
    ).toHaveTextContent('Not in this cycle')
  })

  it('keeps the Day 1 message for a grouped late joiner', async () => {
    clearEmployees()
    await seedDirectory('2026-07-15')
    resetGoalsDemo()
    await putPeopleInGroup([1, 2])
    setActivePerson(REPORT_ID)

    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={REPORT_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Not eligible this quarter' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Direct Report joined after Day 1, so goal setting starts next quarter.',
      ),
    ).toBeInTheDocument()
  })
})

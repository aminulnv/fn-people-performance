import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from '@/lib/AuthProvider'
import { clearSession, writeSession } from '@/lib/authApi'
import { clearEmployees, createEmployee } from '@/lib/employees/store'
import {
  getGoalsSnapshot,
  resetGoalsDemo,
  savePersonGoals,
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
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open')
    }
  })

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

  it('hides the person goal totals on an embedded profile', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={MANAGER_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('group', { name: 'Goal sections' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('group', { name: /goal totals/i }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /My Reports/i }))

    expect(
      screen.queryByRole('group', { name: /goal totals/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Direct Report goals' }),
    ).toBeInTheDocument()
  })

  it('keeps edit actions when a report goal is opened from an embedded profile', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={MANAGER_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: /My Reports/i }))

    const snapshot = getGoalsSnapshot()
    const goal = snapshot.byPerson[REPORT_ID]?.goals[0]
    expect(goal).toBeTruthy()

    fireEvent.click(await screen.findByText(goal.description))

    expect(getGoalsSnapshot().activePersonId).toBe(MANAGER_ID)
    expect(screen.getByRole('button', { name: 'Edit goal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })

  it('lets a manager edit report weights from the table after confirming reapproval', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={MANAGER_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: /My Reports/i }))

    const snapshot = getGoalsSnapshot()
    const goal = snapshot.byPerson[REPORT_ID]?.goals[0]
    expect(goal).toBeTruthy()

    const weightLabel = `Weight for ${goal.description}`
    const input = await screen.findByLabelText(weightLabel)
    fireEvent.change(input, { target: { value: '30' } })
    fireEvent.blur(input)

    expect(
      await screen.findByRole('dialog', {
        name: /need approval again|goal deadline has passed/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Line Manager' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Line Manager' }).querySelector('.pd-avatar'),
    ).not.toBeNull()
    expect(screen.queryByText(/direct manager/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/skip-level/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Continue editing' }))

    await waitFor(() => {
      expect(
        getGoalsSnapshot().byPerson[REPORT_ID]?.goals[0]?.weight,
      ).toBe(30)
    })
  })

  it('lets a manager edit report measure weights from the expanded table row', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={MANAGER_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: /My Reports/i }))

    const snapshot = getGoalsSnapshot()
    const goal = snapshot.byPerson[REPORT_ID]?.goals[0]
    expect(goal).toBeTruthy()

    fireEvent.click(
      await screen.findByRole('button', {
        name: `Expand ${goal.description}`,
      }),
    )

    expect(
      screen.getByLabelText('Weight for Defects closed'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Decrease Weight for Defects closed' }),
    ).toBeInTheDocument()
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

  it('nests own goals under the same submit card as manager review', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={REPORT_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    const card = await screen.findByRole('region', {
      name: 'Direct Report goals',
    })
    expect(card).not.toHaveTextContent(/goals · Draft/)
    expect(
      screen.getByRole('columnheader', { name: 'Goals Draft' }),
    ).toBeInTheDocument()
    const trail = screen.getByRole('list', { name: /You/ })
    expect(card).not.toContainElement(trail)
    expect(trail).toHaveTextContent('You')
    expect(screen.getByRole('button', { name: 'Submit All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Goal' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Approve' }),
    ).not.toBeInTheDocument()
  })

  it('shows Action required on the card and a measure error in Metrics', async () => {
    const snapshot = getGoalsSnapshot()
    savePersonGoals(
      {
        cycleId: snapshot.cycle.id,
        actorId: REPORT_ID,
        subjectId: REPORT_ID,
      },
      [
        {
          id: 'goal-test',
          ownerId: REPORT_ID,
          description: 'test',
          weight: 50,
          measurements: [],
        },
      ],
    )

    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={REPORT_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Action required')
    expect(alert).toHaveTextContent('Add at least 2 goals')
    expect(alert).toHaveTextContent('Weights need to add up to 100%')
    expect(alert).not.toHaveTextContent('still needs a metric')
    expect(
      screen.getByRole('button', { name: 'Add another goal' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Still needs a metric.' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByTitle('test'))
    const drawer = await screen.findByRole('dialog', { name: 'View test' })
    const ribbon = drawer.querySelector('[role="alert"]')
    expect(ribbon).toHaveTextContent('Action required')
    expect(ribbon).toHaveTextContent('Still needs a metric.')
    expect(ribbon).not.toHaveTextContent('test')
    expect(drawer).not.toHaveTextContent('Add at least 2 goals')
    expect(drawer).not.toHaveTextContent('Weights need to add up to 100%')
  })

  it('does not show a draft banner above the goals', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={REPORT_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('button', { name: /goal cycle/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('group', { name: /goal totals/i }),
    ).not.toBeInTheDocument()
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

  it('does not flash Action required before the store retargets an excluded person', async () => {
    await putPeopleInGroup([2])

    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={REPORT_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.queryByText('Action required')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /add goal/i }),
    ).not.toBeInTheDocument()
    expect(
      await screen.findByRole('status', {
        name: /Not in this cycle\. Direct Report is not assigned to a review group for this cycle\./,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Action required')).not.toBeInTheDocument()
    expect(screen.queryByText('Not started')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('group', { name: /goal totals/i }),
    ).not.toBeInTheDocument()
    const leftoverRow = getGoalsSnapshot().byPerson[REPORT_ID]
    const leftover = leftoverRow?.goals[0]
    expect(leftover).toBeTruthy()
    expect(screen.getByText(leftover.description)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /add goal/i }),
    ).not.toBeInTheDocument()
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
      await screen.findByRole('status', {
        name: /Not in this cycle\. Direct Report is not assigned to a review group for this cycle\./,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/joined after Day 1/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('group', { name: /goal totals/i }),
    ).not.toBeInTheDocument()
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
      await screen.findByRole('status', {
        name: /Not eligible this quarter\. Direct Report joined after Day 1, so goal setting starts next quarter\./,
      }),
    ).toBeInTheDocument()
  })
})

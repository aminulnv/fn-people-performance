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
  sendBackSubmission,
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

function openGoalActions() {
  fireEvent.mouseEnter(
    screen.getByRole('button', { name: 'Goal actions' }).closest('.pd-menu')!,
  )
}

function startEditingGoal() {
  openGoalActions()
  fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
}

function blurGoalName() {
  fireEvent.blur(screen.getByLabelText('Goal name'))
}

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

  it('does not rewrite the People Directory hash when embedded', async () => {
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

  it('shows a success toast after approving goals', async () => {
    renderReportGoals()
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Goals approved.')
    expect(
      screen.queryByRole('button', { name: 'Send Back' }),
    ).not.toBeInTheDocument()
  })

  it('shows a success toast after cascading a goal', async () => {
    const snapshot = getGoalsSnapshot()
    savePersonGoals(
      {
        cycleId: snapshot.cycle.id,
        actorId: MANAGER_ID,
        subjectId: MANAGER_ID,
      },
      [
        {
          id: 'mgr-cascade',
          ownerId: MANAGER_ID,
          description: 'Raise the quality bar',
          weight: 100,
          measurements: [
            {
              id: 'metric-1',
              kind: 'metric',
              title: 'Defects',
              weight: 100,
              unit: 'number',
              direction: 'decrease',
              startValue: 10,
              targetValue: 2,
              currentValue: 8,
            },
          ],
        },
      ],
    )

    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={MANAGER_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByText('Raise the quality bar'))
    startEditingGoal()
    fireEvent.click(screen.getByRole('button', { name: 'Add Cascading To' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cascaded to' }))
    fireEvent.click(
      screen.getByRole('option', { name: /Create New Cascading Goal/ }),
    )
    fireEvent.click(screen.getByRole('checkbox', { name: /Direct Report/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Cascade' }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Goal cascaded.')
  })

  it('shows a success toast after sending goals back', async () => {
    renderReportGoals()
    fireEvent.click(await screen.findByRole('button', { name: 'Send Back' }))
    fireEvent.change(screen.getByLabelText('Send back reason'), {
      target: { value: 'Please add a metric.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Send Back' }))

    expect(await screen.findByText('Goals sent back.')).toBeInTheDocument()
    expect(screen.getByText('Success!')).toBeInTheDocument()
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
    openGoalActions()
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Remove' })).toBeInTheDocument()
  })

  it('persists a sent-back report goal when a task is added', async () => {
    const snapshot = getGoalsSnapshot()
    sendBackSubmission(
      {
        cycleId: snapshot.cycle.id,
        actorId: MANAGER_ID,
        subjectId: REPORT_ID,
      },
      'Please revise the targets.',
    )
    const goal = getGoalsSnapshot().byPerson[REPORT_ID]?.goals[0]
    expect(goal).toBeTruthy()
    const persistedTaskCount = goal.measurements.filter(
      (item) => item.kind === 'milestone',
    ).length

    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={MANAGER_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: /My Reports/i }))
    fireEvent.click(await screen.findByText(goal.description))
    startEditingGoal()
    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }))

    await waitFor(() => {
      expect(
        getGoalsSnapshot().byPerson[REPORT_ID]?.goals[0]?.measurements.filter(
          (item) => item.kind === 'milestone',
        ),
      ).toHaveLength(persistedTaskCount + 1)
    })
    const notice = await screen.findByText('Goal saved.')
    expect(notice.closest('[role="status"]')).toHaveTextContent('Success!')
    openGoalActions()
    expect(screen.queryByRole('menuitem', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Cancel' })).toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: 'Continue Editing' }))

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

  it('shows the same late and action-required notices the report would see', async () => {
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

    renderReportGoals()

    const banner = await screen.findByLabelText('Late Submission')
    expect(banner).toHaveTextContent('Approval Required')
    expect(banner).toHaveTextContent('Line Manager')
    expect(banner).not.toHaveTextContent('You')

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Action Required')
    expect(alert).toHaveTextContent('Add at least 2 goals')
    expect(
      screen.getByRole('button', { name: 'Add Another Goal' }),
    ).toBeInTheDocument()
  })

  it('shows a send-back comment when the manager reviews that set', async () => {
    const snapshot = getGoalsSnapshot()
    sendBackSubmission(
      {
        cycleId: snapshot.cycle.id,
        actorId: MANAGER_ID,
        subjectId: REPORT_ID,
      },
      'Please revise the targets.',
    )

    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={MANAGER_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByRole('button', { name: /My Reports/i }))

    expect(
      await screen.findByText(/Sent Back For Changes/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Please revise the targets/)).toBeInTheDocument()
    expect(screen.getByLabelText('Late Submission')).toBeInTheDocument()
    const notice = screen.getByRole('status')
    const table = screen.getByRole('table', { name: 'Direct Report goals' })
    expect(notice).toHaveClass('pd-goals-banner--sendback')
    expect(table.parentElement).toHaveClass('pd-goals-table-wrap--sendback')
    expect(table.parentElement).toContainElement(notice)
    expect(table).not.toContainElement(notice)
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
    const banner = screen.getByLabelText('Late Submission')
    const trail = screen.getByRole('list', { name: /Line Manager/ })
    expect(banner).toContainElement(trail)
    expect(card).not.toContainElement(banner)
    expect(card).not.toContainElement(trail)
    expect(trail).toHaveTextContent('Line Manager')
    expect(trail).not.toHaveTextContent('You')
    expect(screen.getByRole('button', { name: 'Submit All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Goal' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Approve' }),
    ).not.toBeInTheDocument()
  })

  it('shows a success toast after creating a goal', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={REPORT_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Add Goal' }))
    const nameField = await screen.findByPlaceholderText('Name this goal')
    expect(nameField).toHaveFocus()
    expect(screen.queryByText('Goal name is required')).not.toBeInTheDocument()
    fireEvent.change(nameField, {
      target: { value: 'Ship the launch' },
    })
    blurGoalName()

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Goal created.')
    expect(screen.getByRole('button', { name: 'Got It' })).toBeInTheDocument()
  })

  it('shows a success toast after deleting a goal', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={REPORT_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    const snapshot = getGoalsSnapshot()
    const goal = snapshot.byPerson[REPORT_ID]?.goals[0]
    expect(goal).toBeTruthy()
    fireEvent.click(await screen.findByText(goal.description))
    openGoalActions()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove Goal' }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Goal deleted.')
  })

  it('shows a success message after submitting goals', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={REPORT_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Submit All' }))

    expect(screen.getByRole('dialog')).toHaveTextContent('Submit late?')
    fireEvent.change(screen.getByLabelText('Reason for delay'), {
      target: { value: 'I was on leave until last week.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit Late' }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Goals submitted.')
    expect(screen.getByLabelText('Late Submission')).toHaveTextContent(
      'I was on leave until last week.',
    )
    expect(screen.getByRole('button', { name: 'Got It' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Submit All' }),
    ).not.toBeInTheDocument()
  })

  it('shows Action Required on the card and a measure error on the goal title', async () => {
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
    expect(alert).toHaveTextContent('Action Required')
    expect(alert).toHaveTextContent('Add at least 2 goals')
    expect(alert).not.toHaveTextContent('Weights need to add up to 100%')
    expect(alert).not.toHaveTextContent('still needs a metric')
    expect(
      screen.getByRole('button', { name: 'Add Another Goal' }),
    ).toBeInTheDocument()
    const metricIcon = screen.getByRole('img', {
      name: 'Still needs a metric.',
    })
    expect(metricIcon.closest('.pd-goals-table__title')).toBeTruthy()
    expect(screen.queryByRole('columnheader', { name: 'Metrics' })).toBeNull()

    const submit = screen.getByRole('button', { name: 'Submit All' })
    expect(submit).toBeDisabled()
    fireEvent.mouseEnter(submit.closest('.pd-tooltip')!)
    const submitTip = await screen.findByRole('tooltip')
    expect(submitTip).toHaveTextContent('Add at least 2 goals.')
    expect(submitTip).toHaveTextContent('Weights need to add up to 100%.')
    expect(submitTip).toHaveTextContent('test: Still needs a metric.')

    fireEvent.click(screen.getByTitle('test'))
    const drawer = await screen.findByRole('dialog', { name: 'View test' })
    const ribbon = drawer.querySelector('[role="alert"]')
    expect(ribbon).toHaveTextContent('Action Required')
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

  it('closes the goal window without a draft prompt after a progress log', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={REPORT_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    const goal = getGoalsSnapshot().byPerson[REPORT_ID]?.goals[0]
    expect(goal).toBeTruthy()
    const metric = goal.measurements.find((item) => item.kind === 'metric')
    expect(metric?.kind).toBe('metric')
    if (metric?.kind !== 'metric') throw new Error('expected a metric')

    fireEvent.click(await screen.findByText(goal.description))
    const drawer = await screen.findByRole('dialog', {
      name: `View ${goal.description}`,
    })
    fireEvent.change(
      screen.getByLabelText(`Current progress for ${metric.title}`),
      { target: { value: '42' } },
    )
    fireEvent.click(
      screen.getByRole('button', { name: `Add Update For ${metric.title}` }),
    )

    expect(
      screen.queryByRole('button', { name: 'Save As Draft' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close Goal' }))

    expect(
      screen.queryByRole('dialog', { name: 'Unsaved Changes' }),
    ).not.toBeInTheDocument()
    expect(drawer).not.toBeInTheDocument()
    await waitFor(() => {
      const persisted = getGoalsSnapshot().byPerson[REPORT_ID]?.goals[0]
      const updated = persisted?.measurements.find((item) => item.id === metric.id)
      expect(updated && updated.kind === 'metric' ? updated.currentValue : null).toBe(42)
    })
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

  it('does not flash Action Required before the store retargets an excluded person', async () => {
    await putPeopleInGroup([2])

    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={REPORT_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.queryByText('Action Required')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /add goal/i }),
    ).not.toBeInTheDocument()
    expect(
      await screen.findByRole('status', {
        name: /Not In This Cycle\. Direct Report is not assigned to a group for this cycle\./,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Action Required')).not.toBeInTheDocument()
    expect(screen.queryByText('Not Started')).not.toBeInTheDocument()
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

  it('sits the cycle notice in the goal window ribbon', async () => {
    await putPeopleInGroup([2])
    const leftover = getGoalsSnapshot().byPerson[REPORT_ID]?.goals[0]
    expect(leftover).toBeTruthy()

    render(
      <MemoryRouter>
        <AuthProvider>
          <GoalsPersonDetail personId={REPORT_ID} embedded />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('status', {
        name: /Not In This Cycle\. Direct Report is not assigned to a group for this cycle\./,
      }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByText(leftover.description))
    const drawer = await screen.findByRole('dialog', {
      name: `View ${leftover.description}`,
    })
    const ribbon = drawer.querySelector('.pd-goals-drawer__ribbon')
    const body = drawer.querySelector('.pd-goals-drawer__body')
    expect(ribbon).toHaveTextContent('Not In This Cycle')
    expect(ribbon).toHaveTextContent(
      'Direct Report is not assigned to a group for this cycle.',
    )
    expect(ribbon?.firstElementChild).toHaveClass('pd-goals-sendback--ribbon')
    expect(body).not.toHaveTextContent('Not In This Cycle')
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
        name: /Not In This Cycle\. Direct Report is not assigned to a group for this cycle\./,
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
        name: /Not Eligible This Quarter\. Direct Report joined after Day 1, so goal setting starts next quarter\./,
      }),
    ).toBeInTheDocument()
  })
})

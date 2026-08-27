import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useSearchParams,
} from 'react-router-dom'
import type { PlatformEmployee } from '@/lib/employees/types'
import type { ReviewPacket } from '@/lib/reviews/types'
import {
  createCycleGroup,
  listReviewCycles,
  resetReviewsStoreForTests,
  updateCycleGroup,
} from '@/lib/reviews/store'
import ScorecardDetailPage from '@/pages/ScorecardDetailPage'
import { ReviewPacketView } from './ReviewPacketView'

const {
  employeesState,
  authState,
  packetState,
  saveReviewPacket,
  calibrateReviewPacket,
  appealReviewPacket,
} = vi.hoisted(() => ({
  employeesState: {
    employees: [] as PlatformEmployee[],
    loadState: 'ready' as const,
    loadError: null as string | null,
    isLoading: false,
    reload: vi.fn(async () => {}),
  },
  authState: {
    user: {
      id: '1',
      email: 'alex.manager@example.com',
      name: 'Alex Manager',
      personId: '1',
      employeeId: 1,
    },
  },
  packetState: {
    packet: null as ReviewPacket | null,
  },
  saveReviewPacket: vi.fn(),
  calibrateReviewPacket: vi.fn(),
  appealReviewPacket: vi.fn(),
}))

vi.mock('@/lib/employees/useEmployees', () => ({
  useEmployees: () => employeesState,
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
}))

vi.mock('@/lib/useAuth', () => ({
  useAuth: () => authState,
}))

vi.mock('@/lib/goalsApi', () => ({
  selectGoalCycle: async () => {},
}))

vi.mock('@/lib/goals/store', () => ({
  getGoalsSnapshotForCycle: () => ({ byPerson: {} }),
  subscribeGoalsStore: () => () => {},
}))

vi.mock('@/lib/reviews/packetsApi', () => ({
  fetchReviewPacket: async () => {
    if (!packetState.packet) throw new Error('missing packet')
    return packetState.packet
  },
  saveReviewPacket,
  calibrateReviewPacket,
  appealReviewPacket,
}))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
})

function employee(
  partial: Partial<PlatformEmployee> & { employeeId: number; fullName: string },
): PlatformEmployee {
  return {
    email: `${partial.fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    startDate: '2024-01-01',
    jobTitle: 'Engineer',
    department: 'Product',
    team: 'Core',
    division: '',
    reportsToName: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: 'IC2',
    site: '',
    avatarUrl: '',
    managerEmail: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...partial,
  }
}

function packet(cycleId: string, partial: Partial<ReviewPacket> = {}): ReviewPacket {
  return {
    id: 'pkt-1',
    cycleId,
    groupId: 'group-1',
    employeeId: 2,
    managerEmployeeId: 1,
    status: 'manager_in_progress',
    selfOverallGrade: null,
    managerOverallGrade: null,
    calibratedOverallGrade: null,
    publishedOverallGrade: null,
    managerOverrideReason: '',
    goalsComponent: null,
    answers: [],
    pillarScores: [],
    calibrationEvents: [],
    appeals: [],
    version: 1,
    ...partial,
  }
}

let cycleId = 'q3-2026'

beforeEach(async () => {
  resetReviewsStoreForTests()
  const manager = employee({
    employeeId: 1,
    fullName: 'Alex Manager',
    email: 'alex.manager@example.com',
    jobTitle: 'Engineering Manager',
    jobGrade: 'M1',
  })
  const report = employee({
    employeeId: 2,
    fullName: 'Riley Report',
    reportsToId: 1,
    reportsToName: 'Alex Manager',
    managerEmail: 'alex.manager@example.com',
  })
  employeesState.employees = [manager, report]
  authState.user = {
    id: '1',
    email: 'alex.manager@example.com',
    name: 'Alex Manager',
    personId: '1',
    employeeId: 1,
  }
  const cycle = listReviewCycles()[0]
  if (!cycle) throw new Error('expected a seeded cycle')
  cycleId = cycle.id
  await createCycleGroup(cycle.id, {
    name: 'Everyone',
    memberIds: [1, 2],
  })
  packetState.packet = packet(cycle.id)
  saveReviewPacket.mockReset()
  calibrateReviewPacket.mockReset()
  appealReviewPacket.mockReset()
  saveReviewPacket.mockImplementation(async (_id: string, body: { submit?: boolean }) => ({
    ...packetState.packet!,
    status: body.submit ? 'manager_submitted' : 'manager_in_progress',
    managerOverallGrade: 'performing',
  }))
})

afterEach(() => {
  cleanup()
  employeesState.employees = []
  packetState.packet = null
})

function ScorecardRoute() {
  const [params] = useSearchParams()
  const location = useLocation()
  if (params.get('mode') === 'edit') {
    return <ReviewPacketView cycleId={cycleId} employeeId={2} />
  }
  const notice = (
    location.state as { reviewNotice?: { message: string } } | null
  )?.reviewNotice
  return (
    <>
      <p>Scorecard view</p>
      {notice ? <p role="status">{notice.message}</p> : null}
    </>
  )
}

function renderEdit() {
  return render(
    <MemoryRouter initialEntries={[`/reviews/scorecards/${cycleId}/2?mode=edit`]}>
      <Routes>
        <Route
          path="/reviews/scorecards/:cycleKey/:employeeId"
          element={<ScorecardRoute />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ScorecardDetailPage', () => {
  it('floats Edit in the same action island as the editor', async () => {
    render(
      <MemoryRouter initialEntries={[`/reviews/scorecards/${cycleId}/2`]}>
        <Routes>
          <Route
            path="/reviews/scorecards/:cycleKey/:employeeId"
            element={<ScorecardDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    const toolbar = await screen.findByRole('toolbar', { name: 'Review actions' })
    expect(toolbar.querySelector('.pd-review-packet__island')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      `/reviews/scorecards/${cycleId}/2?mode=edit&stage=manager_review`,
    )
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
  })
})

describe('ReviewPacketView', () => {
  it('does not show a Goals grade on a quarterly check-in by default', async () => {
    renderEdit()
    await screen.findByRole('button', { name: 'Cancel' })
    expect(screen.queryByRole('button', { name: /Goals \(/ })).toBeNull()
    expect(screen.queryByLabelText('Goals grade')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Overall Grade' })).toBeTruthy()
  })

  it('hides the overall grade grid when the group turns it off', async () => {
    const cycle = listReviewCycles().find((item) => item.id === cycleId)
    const group = cycle?.groups?.find((item) => item.memberIds.includes(2))
    if (!cycle || !group?.settings.reviewPolicy) {
      throw new Error('expected a seeded quarterly group')
    }
    await updateCycleGroup(cycle.id, group.id, {
      settings: {
        reviewPolicy: {
          ...group.settings.reviewPolicy,
          managerReview: {
            ...group.settings.reviewPolicy.managerReview,
            gradeOverall: false,
          },
        },
      },
    })

    renderEdit()
    await screen.findByRole('button', { name: 'Cancel' })
    expect(screen.queryByRole('heading', { name: 'Overall Grade' })).toBeNull()
  })

  it('shows a Goals grade when the group turns it on', async () => {
    const cycle = listReviewCycles().find((item) => item.id === cycleId)
    const group = cycle?.groups?.find((item) => item.memberIds.includes(2))
    if (!cycle || !group?.settings.reviewPolicy) {
      throw new Error('expected a seeded quarterly group')
    }
    await updateCycleGroup(cycle.id, group.id, {
      settings: {
        reviewPolicy: {
          ...group.settings.reviewPolicy,
          managerReview: {
            ...group.settings.reviewPolicy.managerReview,
            gradeGoals: true,
          },
        },
      },
    })

    renderEdit()
    expect(
      await screen.findByRole('button', { name: /Goals \(/ }),
    ).toBeTruthy()
  })

  it('does not offer calibration while the manager review is still open', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          `/reviews/scorecards/${cycleId}/2?mode=edit&stage=calibration_hod_hrbp`,
        ]}
      >
        <Routes>
          <Route
            path="/reviews/scorecards/:cycleKey/:employeeId"
            element={<ScorecardRoute />}
          />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('button', { name: 'Cancel' })
    expect(
      screen.queryByRole('button', { name: 'Record calibration change' }),
    ).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Calibration' })).toBeNull()
  })

  it('keeps Cancel, Save draft, and Submit in one action row', async () => {
    renderEdit()
    const toolbar = await screen.findByRole('toolbar', { name: 'Review actions' })
    const actions = toolbar.querySelector('.pd-review-packet__actions')
    expect(toolbar.querySelector('.pd-review-packet__island')).toBeTruthy()
    expect(actions?.querySelectorAll('button')).toHaveLength(3)
    expect(actions).toHaveTextContent('Cancel')
    expect(actions).toHaveTextContent('Save draft')
    expect(actions).toHaveTextContent('Submit')
  })

  it('leaves edit mode immediately when Cancel has nothing to discard', async () => {
    renderEdit()

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Scorecard view')).toBeInTheDocument()
  })

  it('warns before Cancel discards unsaved edits', async () => {
    renderEdit()
    await screen.findByRole('button', { name: 'Cancel' })

    const strengths = screen.getByRole('textbox', { name: /^Strengths/ })
    fireEvent.change(strengths, {
      target: { value: 'Shipped the cycle work' },
    })
    await waitFor(() => expect(strengths).toHaveValue('Shipped the cycle work'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('dialog', { name: 'Unsaved changes' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }))
    expect(screen.queryByText('Scorecard view')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^Strengths/ })).toHaveValue(
      'Shipped the cycle work',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.getByText('Scorecard view')).toBeInTheDocument()
  })

  it('leaves edit mode after Save draft', async () => {
    renderEdit()
    const saveDraft = await screen.findByRole('button', { name: 'Save draft' })
    await waitFor(() => expect(saveDraft).toBeEnabled())

    fireEvent.click(saveDraft)
    await waitFor(() => {
      expect(screen.getByText('Scorecard view')).toBeInTheDocument()
    })
    expect(screen.getByRole('status')).toHaveTextContent('Draft saved.')
    expect(saveReviewPacket).toHaveBeenCalledWith(
      'pkt-1',
      expect.objectContaining({ submit: false }),
    )
  })

  it('leaves edit mode after Submit', async () => {
    renderEdit()
    const submit = await screen.findByRole('button', { name: 'Submit' })
    await waitFor(() => expect(submit).toBeEnabled())

    fireEvent.click(submit)
    await waitFor(() => {
      expect(screen.getByText('Scorecard view')).toBeInTheDocument()
    })
    expect(screen.getByRole('status')).toHaveTextContent('Review submitted.')
    expect(saveReviewPacket).toHaveBeenCalledWith(
      'pkt-1',
      expect.objectContaining({ submit: true }),
    )
  })

  it('shows a success toast after recording calibration', async () => {
    const cycle = listReviewCycles().find((item) => item.id === cycleId)
    const group = cycle?.groups?.find((item) => item.memberIds.includes(2))
    if (!cycle || !group) throw new Error('expected a seeded group')
    await updateCycleGroup(cycle.id, group.id, {
      stagesConfig: {
        ...group.stagesConfig,
        calibration: { ...group.stagesConfig.calibration, enabled: true },
        reviewStages: (group.stagesConfig.reviewStages ?? []).map((stage) =>
          stage.id === 'calibration_hod_hrbp'
            ? { ...stage, enabled: true }
            : stage,
        ),
      },
    })
    packetState.packet = packet(cycleId, {
      status: 'manager_submitted',
      managerOverallGrade: 'performing',
    })
    calibrateReviewPacket.mockResolvedValue({
      ...packetState.packet,
      calibratedOverallGrade: 'exceeding',
    })

    render(
      <MemoryRouter
        initialEntries={[
          `/reviews/scorecards/${cycleId}/2?mode=edit&stage=calibration_hod_hrbp`,
        ]}
      >
        <Routes>
          <Route
            path="/reviews/scorecards/:cycleKey/:employeeId"
            element={<ScorecardRoute />}
          />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByLabelText('Calibrated grade'))
    fireEvent.click(screen.getByRole('option', { name: 'Exceeding' }))
    fireEvent.change(screen.getByLabelText('Reason for the change'), {
      target: { value: 'Aligned with the department mix.' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Record calibration change' }),
    )

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Calibration recorded.')
    expect(calibrateReviewPacket).toHaveBeenCalled()
  })

  it('shows a success toast after submitting an appeal', async () => {
    const cycle = listReviewCycles().find((item) => item.id === cycleId)
    const group = cycle?.groups?.find((item) => item.memberIds.includes(2))
    if (!cycle || !group) throw new Error('expected a seeded group')
    const reviewStages = [...(group.stagesConfig.reviewStages ?? [])]
    const appealIndex = reviewStages.findIndex((stage) => stage.id === 'appeal')
    if (appealIndex >= 0) {
      reviewStages[appealIndex] = { ...reviewStages[appealIndex], enabled: true }
    } else {
      reviewStages.push({
        id: 'appeal',
        enabled: true,
        start: { date: '2026-10-01', time: '00:00' },
        end: { date: '2026-10-15', time: '00:00' },
      })
    }
    await updateCycleGroup(cycle.id, group.id, {
      stagesConfig: {
        ...group.stagesConfig,
        reviewStages,
      },
    })
    authState.user = {
      id: '2',
      email: 'riley.report@example.com',
      name: 'Riley Report',
      personId: '2',
      employeeId: 2,
    }
    packetState.packet = packet(cycleId, {
      status: 'released_to_employees',
      publishedOverallGrade: 'performing',
    })
    appealReviewPacket.mockResolvedValue({
      ...packetState.packet,
      status: 'appealed',
      appeals: [
        {
          id: 'appeal-1',
          body: 'The grade missed shipped work.',
          status: 'open',
          createdAt: '2026-08-27T00:00:00.000Z',
          createdByEmployeeId: 2,
        },
      ],
    })

    render(
      <MemoryRouter
        initialEntries={[
          `/reviews/scorecards/${cycleId}/2?mode=edit&stage=publish_employees`,
        ]}
      >
        <Routes>
          <Route
            path="/reviews/scorecards/:cycleKey/:employeeId"
            element={<ScorecardRoute />}
          />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(await screen.findByLabelText('Written record'), {
      target: { value: 'The grade missed shipped work.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit appeal' }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Appeal submitted.')
    expect(appealReviewPacket).toHaveBeenCalledWith(
      'pkt-1',
      'The grade missed shipped work.',
    )
  })
})

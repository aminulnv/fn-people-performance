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
import type { SystemPermission } from '@/lib/accessControl/types'
import type { ReviewPacket } from '@/lib/reviews/types'
import {
  createCycleGroup,
  createReviewCycle,
  listReviewCycles,
  resetReviewsStoreForTests,
  updateCycleGroup,
} from '@/lib/reviews/store'
import { defaultReviewPolicy } from '@/lib/reviews/reviewPolicy'
import { updateScorecardFeedback } from '@/lib/reviews/scorecardTemplates'
import {
  assignSkillToEmployee,
  resetSkillsStoreForTests,
} from '@/lib/skills/store'
import ScorecardDetailPage from '@/pages/ScorecardDetailPage'
import { ReviewPacketView } from './ReviewPacketView'

const {
  employeesState,
  authState,
  packetState,
  saveReviewPacket,
  calibrateReviewPacket,
  appealReviewPacket,
  resolveReviewAppeal,
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
      permissions: [] as SystemPermission[],
    },
  },
  packetState: {
    packet: null as ReviewPacket | null,
  },
  saveReviewPacket: vi.fn(),
  calibrateReviewPacket: vi.fn(),
  appealReviewPacket: vi.fn(),
  resolveReviewAppeal: vi.fn(),
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
  resolveReviewAppeal,
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
  resetSkillsStoreForTests()
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
    permissions: [],
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
  resolveReviewAppeal.mockReset()
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

  it('sends Edit from Published to the manager review form stage', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          `/reviews/scorecards/${cycleId}/2?stage=publish_employees`,
        ]}
      >
        <Routes>
          <Route
            path="/reviews/scorecards/:cycleKey/:employeeId"
            element={<ScorecardDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      `/reviews/scorecards/${cycleId}/2?mode=edit&stage=manager_review`,
    )
  })
})

describe('ReviewPacketView', () => {
  it('shows a Goals grade on a quarterly check-in by default', async () => {
    renderEdit()
    expect(
      await screen.findByRole('button', { name: /Goals \(/ }),
    ).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Overall Grading' })).toBeNull()
  })

  it('hides Skills when Grade Areas has Skills off', async () => {
    assignSkillToEmployee(2, 'skill-ai-fluency')
    renderEdit()
    await screen.findByRole('button', { name: /Goals \(/ })
    expect(screen.queryByRole('region', { name: 'Skills' })).toBeNull()
    expect(
      screen.queryByRole('region', { name: 'Skills (previously graded)' }),
    ).toBeNull()
  })

  it('shows prior skill grades read-only when Skills is off', async () => {
    assignSkillToEmployee(2, 'skill-ai-fluency')
    packetState.packet = packet(cycleId, {
      pillarScores: [
        {
          pillarId: 'skill:skill-ai-fluency',
          actorRole: 'manager',
          grade: 'performing',
          comment: '',
        },
      ],
    })
    renderEdit()
    expect(
      await screen.findByRole('region', {
        name: 'Skills (previously graded)',
      }),
    ).toBeTruthy()
    expect(
      screen.getByText('Saved grades. Not counted while Skills is off.'),
    ).toBeTruthy()
    expect(screen.getByText('Performing')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'AI Fluency grade' })).toBeNull()
  })

  it('shows assigned profile skills when Skills is on in Grade Areas', async () => {
    const custom = await createReviewCycle({
      type: 'custom',
      name: 'Skills on review',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-12-31T00:00:00.000Z',
    })
    cycleId = custom.id
    const group = await createCycleGroup(custom.id, {
      name: 'Everyone',
      memberIds: [1, 2],
    })
    const policy = defaultReviewPolicy('custom')
    await updateCycleGroup(custom.id, group.id, {
      settings: {
        reviewPolicy: {
          ...policy,
          scorecard: {
            ...policy.scorecard,
            pillars: policy.scorecard.pillars.map((pillar) =>
              pillar.id === 'skills'
                ? { ...pillar, enabled: true, weight: 25 }
                : pillar.id === 'goals'
                  ? { ...pillar, enabled: true, weight: 75 }
                  : { ...pillar, enabled: false, weight: 0 },
            ),
          },
          managerReview: {
            ...policy.managerReview,
            gradeGoals: true,
            gradeOverall: true,
          },
        },
      },
    })
    packetState.packet = packet(custom.id)
    assignSkillToEmployee(2, 'skill-ai-fluency')
    assignSkillToEmployee(2, 'skill-account-planning')
    renderEdit()
    expect(
      await screen.findByRole('region', { name: 'Skills' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'AI Fluency grade' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Account Planning grade' }),
    ).toBeTruthy()
  })

  it('shows the overall grade grid when the group turns it on', async () => {
    const custom = await createReviewCycle({
      type: 'custom',
      name: 'Custom review',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-12-31T00:00:00.000Z',
    })
    cycleId = custom.id
    const group = await createCycleGroup(custom.id, {
      name: 'Everyone',
      memberIds: [1, 2],
    })
    await updateCycleGroup(custom.id, group.id, {
      settings: {
        reviewPolicy: {
          ...defaultReviewPolicy('custom'),
          managerReview: {
            ...defaultReviewPolicy('custom').managerReview,
            gradeGoals: true,
            gradeOverall: true,
          },
        },
      },
    })
    packetState.packet = packet(custom.id)

    renderEdit()
    await screen.findByRole('button', { name: 'Cancel' })
    expect(screen.getByRole('heading', { name: 'Overall Grading' })).toBeTruthy()
  })

  it('hides a Goals grade when the group turns it off', async () => {
    const custom = await createReviewCycle({
      type: 'custom',
      name: 'Custom review',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-12-31T00:00:00.000Z',
    })
    cycleId = custom.id
    const group = await createCycleGroup(custom.id, {
      name: 'Everyone',
      memberIds: [1, 2],
    })
    await updateCycleGroup(custom.id, group.id, {
      settings: {
        reviewPolicy: {
          ...defaultReviewPolicy('custom'),
          managerReview: {
            ...defaultReviewPolicy('custom').managerReview,
            gradeGoals: false,
            gradeOverall: false,
          },
        },
      },
    })
    packetState.packet = packet(custom.id)

    renderEdit()
    await screen.findByRole('button', { name: 'Cancel' })
    expect(screen.queryByRole('button', { name: /Goals \(/ })).toBeNull()
    expect(screen.queryByLabelText('Goals Grading')).toBeNull()
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
      screen.queryByRole('button', { name: 'Record Calibration Change' }),
    ).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Calibration' })).toBeNull()
  })

  it('keeps Cancel, Save Draft, and Submit in one action row', async () => {
    renderEdit()
    const toolbar = await screen.findByRole('toolbar', { name: 'Review actions' })
    const actions = toolbar.querySelector('.pd-review-packet__actions')
    expect(toolbar.querySelector('.pd-review-packet__island')).toBeTruthy()
    expect(actions?.querySelectorAll('button')).toHaveLength(3)
    expect(actions).toHaveTextContent('Cancel')
    expect(actions).toHaveTextContent('Save Draft')
    expect(actions).toHaveTextContent('Submit')
  })

  it('leaves edit mode immediately when Cancel has nothing to discard', async () => {
    renderEdit()

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Scorecard view')).toBeInTheDocument()
  })

  it('warns before Cancel discards unsaved edits', async () => {
    const cycle = listReviewCycles().find((item) => item.id === cycleId)
    const group = cycle?.groups?.find((item) => item.memberIds.includes(2))
    if (!cycle || !group?.settings.reviewPolicy) {
      throw new Error('expected a seeded quarterly group')
    }
    await updateCycleGroup(cycle.id, group.id, {
      settings: {
        reviewPolicy: updateScorecardFeedback(group.settings.reviewPolicy, {
          enabled: true,
        }),
      },
    })

    renderEdit()
    await screen.findByRole('button', { name: 'Cancel' })

    const strengths = screen.getByRole('textbox', { name: /^Strengths/ })
    fireEvent.change(strengths, {
      target: { value: 'Shipped the cycle work' },
    })
    await waitFor(() => expect(strengths).toHaveValue('Shipped the cycle work'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('dialog', { name: 'Unsaved Changes' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }))
    expect(screen.queryByText('Scorecard view')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^Strengths/ })).toHaveValue(
      'Shipped the cycle work',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.getByText('Scorecard view')).toBeInTheDocument()
  })

  it('leaves edit mode after Save Draft', async () => {
    renderEdit()
    const saveDraft = await screen.findByRole('button', { name: 'Save Draft' })
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
      screen.getByRole('button', { name: 'Record Calibration Change' }),
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
      permissions: [],
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
          `/reviews/scorecards/${cycleId}/2?mode=edit&stage=appeal`,
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
    fireEvent.click(screen.getByRole('button', { name: 'Submit Appeal' }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Appeal submitted.')
    expect(appealReviewPacket).toHaveBeenCalledWith(
      'pkt-1',
      'The grade missed shipped work.',
    )
  })

  it('lets an admin override the final rating with a required justification', async () => {
    const cycle = listReviewCycles().find((item) => item.id === cycleId)
    const group = cycle?.groups?.find((item) => item.memberIds.includes(2))
    if (!cycle || !group) throw new Error('expected a seeded group')
    await updateCycleGroup(cycle.id, group.id, {
      stagesConfig: {
        ...group.stagesConfig,
        reviewStages: [
          ...(group.stagesConfig.reviewStages ?? []).filter(
            (stage) => stage.id !== 'appeal',
          ),
          {
            id: 'appeal',
            enabled: true,
            start: { date: '2026-10-01', time: '00:00' },
            end: { date: '2026-10-15', time: '00:00' },
          },
        ],
      },
    })
    authState.user = {
      id: '1',
      email: 'alex.manager@example.com',
      name: 'Alex Manager',
      personId: '1',
      employeeId: 1,
      permissions: ['platform.write_all'],
    }
    packetState.packet = packet(cycleId, {
      status: 'appealed',
      publishedOverallGrade: 'performing',
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
    resolveReviewAppeal.mockResolvedValue({
      ...packetState.packet,
      publishedOverallGrade: 'exceeding',
      appeals: [{ ...packetState.packet.appeals[0], status: 'resolved' }],
    })

    render(
      <MemoryRouter
        initialEntries={[
          `/reviews/scorecards/${cycleId}/2?mode=edit&stage=appeal`,
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

    fireEvent.click(await screen.findByLabelText('Final rating'))
    fireEvent.click(screen.getByRole('option', { name: 'Exceeding' }))
    fireEvent.change(screen.getByLabelText('Override justification'), {
      target: { value: 'Verified evidence supports the higher rating.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Resolve Appeal' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Appeal resolved and final rating updated.',
    )
    expect(resolveReviewAppeal).toHaveBeenCalledWith('pkt-1', 'appeal-1', {
      toGrade: 'exceeding',
      justification: 'Verified evidence supports the higher rating.',
    })
  })
})

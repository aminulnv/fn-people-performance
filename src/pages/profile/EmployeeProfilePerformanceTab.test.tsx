import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { PlatformEmployee } from '@/lib/employees/types'
import type { ReviewCycle } from '@/lib/reviews/types'
import { fetchReviewCyclesRemote } from '@/lib/reviews/remoteApi'
import * as packetsApi from '@/lib/reviews/packetsApi'
import {
  createCycleGroup,
  createReviewCycle,
  ensureReviewCyclesLoaded,
  listReviewCycles,
  resetReviewsStoreForTests,
  setReviewsLocalModeForTests,
} from '@/lib/reviews/store'
import type { ReviewPacket } from '@/lib/reviews/types'
import { EmployeeProfilePerformanceTab } from './EmployeeProfilePerformanceTab'

vi.mock('@/lib/reviews/remoteApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/reviews/remoteApi')>()
  return {
    ...actual,
    fetchReviewCyclesRemote: vi.fn(),
  }
})

const employee: PlatformEmployee = {
  employeeId: 1,
  fullName: 'Test Employee',
  email: 'employee@example.com',
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
}

vi.mock('@/lib/useAuth', () => ({
  useAuth: () => ({ user: { email: employee.email } }),
}))

vi.mock('@/lib/employees/useEmployees', () => ({
  useEmployees: () => ({ employees: [employee] }),
}))

function renderTab() {
  return render(
    <MemoryRouter>
      <EmployeeProfilePerformanceTab employee={employee} isSelf />
    </MemoryRouter>,
  )
}

describe('EmployeeProfilePerformanceTab', () => {
  beforeEach(() => {
    resetReviewsStoreForTests()
  })

  afterEach(() => {
    cleanup()
    resetReviewsStoreForTests()
    vi.restoreAllMocks()
  })

  it('waits for review-cycle hydration instead of showing an empty state', async () => {
    const cycle = listReviewCycles()[0]
    if (!cycle) throw new Error('Expected a seeded review cycle')
    await createCycleGroup(cycle.id, {
      name: 'Everyone',
      memberIds: [employee.employeeId],
    })
    const seededCycles = structuredClone(listReviewCycles()) as ReviewCycle[]

    resetReviewsStoreForTests()
    setReviewsLocalModeForTests(false)
    vi.mocked(fetchReviewCyclesRemote).mockResolvedValue(seededCycles)

    renderTab()

    expect(
      screen.getByLabelText('Loading performance reviews'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('No Performance Reviews Yet'),
    ).not.toBeInTheDocument()

    await ensureReviewCyclesLoaded()

    expect(
      await screen.findByRole('heading', { name: 'Performance History' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Loading performance reviews'),
    ).not.toBeInTheDocument()
  })

  it('renders status, window, and grade columns for each cycle', async () => {
    const cycle = listReviewCycles()[0]
    if (!cycle) throw new Error('Expected a seeded review cycle')
    await createCycleGroup(cycle.id, {
      name: 'Everyone',
      memberIds: [employee.employeeId],
    })

    renderTab()

    expect(
      await screen.findByRole('heading', { name: 'Performance History' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/1 cycle/)).toBeInTheDocument()
    expect(
      screen.getByRole('row', { name: /Not Started/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('row', { name: /Not Started.*—/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Quarterly|Annual|Custom/)).toBeInTheDocument()
  })

  it('shows completed status and grade from the review packet', async () => {
    const cycle = listReviewCycles()[0]
    if (!cycle) throw new Error('Expected a seeded review cycle')
    await createCycleGroup(cycle.id, {
      name: 'Everyone',
      memberIds: [employee.employeeId],
    })
    const packet: ReviewPacket = {
      id: `pkt-${cycle.id}-${employee.employeeId}`,
      cycleId: cycle.id,
      groupId: null,
      employeeId: employee.employeeId,
      managerEmployeeId: null,
      status: 'released_to_employees',
      selfOverallGrade: null,
      managerOverallGrade: 'performing',
      calibratedOverallGrade: null,
      publishedOverallGrade: 'performing',
      managerOverrideReason: '',
      goalsComponent: null,
      answers: [],
      pillarScores: [],
      calibrationEvents: [],
      appeals: [],
      version: 1,
    }
    vi.spyOn(packetsApi, 'fetchReviewPacketSummary').mockResolvedValue(packet)

    renderTab()

    expect(
      await screen.findByRole('row', { name: /Completed/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Performing')).toBeInTheDocument()
    expect(screen.queryByText('Not started')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('row', { name: /No grade|Ungraded|Pending/i }),
    ).not.toBeInTheDocument()
  })

  it('nests linked quarters under the annual with expand/collapse', async () => {
    await createReviewCycle({ type: 'regular', periodKey: 'q1-2026' })
    await createReviewCycle({ type: 'regular', periodKey: 'annual-2026' })

    for (const cycle of listReviewCycles()) {
      await createCycleGroup(cycle.id, {
        name: 'Everyone',
        memberIds: [employee.employeeId],
      })
    }

    renderTab()

    expect(
      await screen.findByRole('button', { name: 'Collapse Annual 2026' }),
    ).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: /Q1 2026/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Q3 2026/ })).toBeInTheDocument()
    expect(
      document.querySelectorAll('.pd-reviews-cycles__branch'),
    ).toHaveLength(2)
    expect(
      document.querySelector('.pd-reviews-cycles__row--open'),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', { name: 'Collapse Annual 2026' }),
    )
    expect(
      screen.getByRole('button', { name: 'Expand Annual 2026' }),
    ).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: /Q1 2026/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Q3 2026/ })).not.toBeInTheDocument()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { PlatformEmployee } from '@/lib/employees/types'
import type { ReviewCycle } from '@/lib/reviews/types'
import { fetchReviewCyclesRemote } from '@/lib/reviews/remoteApi'
import {
  createCycleGroup,
  ensureReviewCyclesLoaded,
  listReviewCycles,
  resetReviewsStoreForTests,
  setReviewsLocalModeForTests,
} from '@/lib/reviews/store'
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
      screen.getByRole('link', { name: /Not Started/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('No grade')).toBeInTheDocument()
    expect(screen.getByText(/Quarterly|Annual|Custom/)).toBeInTheDocument()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { PlatformEmployee } from '@/lib/employees/types'
import type { ReviewPacket } from '@/lib/reviews/types'
import {
  createCycleGroup,
  listReviewCycles,
  resetReviewsStoreForTests,
} from '@/lib/reviews/store'
import AnalyticsPage from './AnalyticsPage'

const { employeesState, authState, packetsState } = vi.hoisted(() => ({
  employeesState: {
    employees: [] as PlatformEmployee[],
    loadState: 'ready' as 'idle' | 'loading' | 'ready' | 'error',
    loadError: null as string | null,
    isLoading: false,
    reload: vi.fn(async () => {}),
  },
  authState: {
    user: {
      email: 'alex.manager@example.com',
      name: 'Alex Manager',
      permissions: ['platform.read_all'] as string[],
    },
  },
  packetsState: {
    packets: [] as ReviewPacket[],
  },
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

vi.mock('@/lib/reviews/packetsApi', () => ({
  fetchReviewPackets: async () => packetsState.packets,
}))

vi.mock('@/lib/goals/remoteApi', () => ({
  fetchCycleGoalSubmissionsRemote: async () => [],
}))

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

function packet(
  employeeId: number,
  status: ReviewPacket['status'],
  extras: Partial<ReviewPacket> = {},
): ReviewPacket {
  return {
    id: `pkt-${employeeId}`,
    cycleId: 'q3-2026',
    groupId: 'grp-1',
    employeeId,
    managerEmployeeId: 1,
    status,
    selfOverallGrade: null,
    managerOverallGrade: extras.managerOverallGrade ?? null,
    calibratedOverallGrade: null,
    publishedOverallGrade: extras.publishedOverallGrade ?? null,
    managerOverrideReason: '',
    goalsComponent: null,
    answers: [],
    pillarScores: [],
    calibrationEvents: [],
    appeals: [],
    version: 1,
    ...extras,
  }
}

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
  const peer = employee({
    employeeId: 3,
    fullName: 'Casey Peer',
    department: 'Marketing',
    reportsToName: 'Other Manager',
  })
  employeesState.employees = [manager, report, peer]
  authState.user = {
    email: 'alex.manager@example.com',
    name: 'Alex Manager',
    permissions: ['platform.read_all'],
  }
  const cycle = listReviewCycles()[0]
  if (!cycle) throw new Error('expected a seeded cycle')
  await createCycleGroup(cycle.id, {
    name: 'Everyone',
    memberIds: [1, 2, 3],
  })
  packetsState.packets = [
    packet(1, 'released_to_employees', { publishedOverallGrade: 'performing' }),
    packet(2, 'not_started'),
    packet(3, 'manager_in_progress', { managerOverallGrade: 'exceeding' }),
  ]
})

afterEach(() => {
  cleanup()
  employeesState.employees = []
  packetsState.packets = []
})

function renderPage(hash = '#everyone') {
  return render(
    <MemoryRouter initialEntries={[`/analytics${hash}`]}>
      <AnalyticsPage />
    </MemoryRouter>,
  )
}

describe('AnalyticsPage', () => {
  it('shows the queues a manager can act on', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Needs Attention' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Reviews' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Goals' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Reviews Not Started/i }),
    ).toHaveAttribute('href', '/reviews')
    expect(
      screen.getByRole('link', { name: /Manager Reviews Still Open/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Review Pipeline' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Grade Mix Vs Guideline' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Departments Behind' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Managers To Follow Up' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Alex Manager' })).toHaveAttribute(
      'href',
      '/people/1',
    )
    expect(screen.queryByText('Coming Soon')).not.toBeInTheDocument()
  })

  it('puts the cycle picker first and clears the dashboard from Clear', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Needs Attention' })

    fireEvent.click(screen.getByRole('button', { name: /Cycle:/ }))
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAccessibleName('Clear')

    fireEvent.click(options[0])
    expect(
      screen.getByRole('heading', { name: 'Pick A Cycle' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Needs Attention' }),
    ).not.toBeInTheDocument()
  })
})

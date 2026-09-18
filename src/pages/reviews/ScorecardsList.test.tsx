import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  createCycleGroup,
  createReviewCycle,
  listReviewCycles,
  resetReviewsStoreForTests,
} from '@/lib/reviews/store'
import type { ReviewPacket } from '@/lib/reviews/types'
import { ScorecardsList } from './ScorecardsList'

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
      id: '1',
      email: 'alex.manager@example.com',
      name: 'Alex Manager',
      personId: '1',
      permissions: [] as string[],
    } as {
      email: string
      name: string
      permissions: string[]
    } | null,
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
    reportsToName: 'Other Manager',
  })
  employeesState.employees = [manager, report, peer]
  authState.user = {
    email: 'alex.manager@example.com',
    name: 'Alex Manager',
    permissions: [],
  }
  const { listReviewCycles } = await import('@/lib/reviews/store')
  const cycle = listReviewCycles()[0]
  if (!cycle) throw new Error('expected a seeded cycle')
  await createCycleGroup(cycle.id, {
    name: 'Everyone',
    memberIds: [1, 2, 3],
  })
  packetsState.packets = []
})

afterEach(() => {
  cleanup()
  employeesState.employees = []
  packetsState.packets = []
  window.localStorage.removeItem('reviews-scorecards-visible-columns-v2')
})

function renderList(hash = '') {
  return render(
    <MemoryRouter initialEntries={[`/reviews/scorecards${hash}`]}>
      <ScorecardsList />
    </MemoryRouter>,
  )
}

describe('ScorecardsList', () => {
  it('uses the header eye to hide and show every grade', async () => {
    authState.user = {
      email: 'alex.manager@example.com',
      name: 'Alex Manager',
      permissions: ['platform.read_all'],
    }
    const cycle = listReviewCycles()[0]
    if (!cycle) throw new Error('expected a seeded cycle')
    packetsState.packets = [
      {
        cycleId: cycle.id,
        employeeId: 2,
        status: 'released_to_employees',
        publishedOverallGrade: 'performing',
        calibratedOverallGrade: null,
        managerOverallGrade: null,
        selfOverallGrade: null,
      } as ReviewPacket,
      {
        cycleId: cycle.id,
        employeeId: 3,
        status: 'manager_submitted',
        publishedOverallGrade: null,
        calibratedOverallGrade: null,
        managerOverallGrade: 'exceeding',
        selfOverallGrade: null,
      } as ReviewPacket,
    ]

    renderList('#everyone')

    const showAll = await screen.findByRole('button', {
      name: 'Show All Grades',
    })
    expect(screen.queryByText('Performing')).toBeNull()
    expect(screen.queryByText('Exceeding')).toBeNull()

    fireEvent.click(showAll)
    expect(screen.getByText('Performing')).toBeInTheDocument()
    expect(screen.getByText('Exceeding')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hide All Grades' }))
    expect(screen.queryByText('Performing')).toBeNull()
    expect(screen.queryByText('Exceeding')).toBeNull()
  })

  it('filters scorecards from the Filters menu', async () => {
    authState.user = {
      email: 'alex.manager@example.com',
      name: 'Alex Manager',
      permissions: ['platform.read_all'],
    }
    renderList('#everyone')

    await screen.findByRole('link', { name: 'Casey Peer' })
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Employee' }))
    fireEvent.click(screen.getByRole('option', { name: 'Casey Peer' }))

    expect(scorecardLink('Casey Peer')).toBeInTheDocument()
    expect(scorecardLink('Riley Report')).toBeNull()
    expect(screen.getByText('1 shown')).toBeInTheDocument()
  })

  it('scopes the manager queue with My Reviews and My Reports', async () => {
    renderList()

    expect(
      await screen.findByRole('button', { name: 'My Reports' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'My Reviews' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Everyone' })).toBeNull()
    expect(scorecardLink('Riley Report')).toBeInTheDocument()
    expect(scorecardLink('Alex Manager')).toBeNull()
    expect(scorecardLink('Casey Peer')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'My Reviews' }))
    expect(await screen.findByRole('link', { name: 'Alex Manager' })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/reviews\/scorecards\//),
    )
    expect(scorecardLink('Riley Report')).toBeNull()
  })

  it('shows Everyone to All read access', async () => {
    authState.user = {
      email: 'alex.manager@example.com',
      name: 'Alex Manager',
      permissions: ['platform.read_all'],
    }
    renderList()

    fireEvent.click(await screen.findByRole('button', { name: 'Everyone' }))
    expect(await screen.findByRole('link', { name: 'Casey Peer' })).toBeInTheDocument()
    expect(scorecardLink('Riley Report')).toBeInTheDocument()
    expect(scorecardLink('Alex Manager')).toBeInTheDocument()
  })

  it('lists scorecards from every selected cycle', async () => {
    authState.user = {
      email: 'alex.manager@example.com',
      name: 'Alex Manager',
      permissions: ['platform.read_all'],
    }
    const extra = await createReviewCycle({
      type: 'regular',
      periodKey: 'q2-2026',
    })
    await createCycleGroup(extra.id, {
      name: 'Everyone',
      memberIds: [1, 2, 3],
    })

    renderList('#everyone')

    fireEvent.click(await screen.findByRole('button', { name: /Cycle:/ }))
    fireEvent.click(screen.getByRole('option', { name: new RegExp(extra.name) }))

    expect(
      await screen.findByRole('button', { name: /and 1 more/ }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(extra.name).length).toBeGreaterThan(0)
  })

  it('hides optional columns from the Columns menu', async () => {
    authState.user = {
      email: 'alex.manager@example.com',
      name: 'Alex Manager',
      permissions: ['platform.read_all'],
    }
    window.localStorage.removeItem('reviews-scorecards-visible-columns-v2')
    renderList('#everyone')

    await screen.findByRole('link', { name: 'Casey Peer' })
    expect(screen.getByRole('columnheader', { name: /^Role/ })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /^Cycle/ })).toBeNull()
    expect(screen.queryByRole('columnheader', { name: /^Seniority/ })).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Columns, 2 hidden' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Columns, 2 hidden' }))
    fireEvent.click(screen.getByRole('option', { name: 'Role' }))

    expect(screen.queryByRole('columnheader', { name: /^Role/ })).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Columns, 3 hidden' }),
    ).toBeInTheDocument()
  })
})

function scorecardLink(name: string) {
  return (
    screen
      .queryAllByRole('link', { name })
      .find((link) => link.getAttribute('href')?.includes('/reviews/scorecards/')) ??
    null
  )
}

import type { ReactElement } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PlatformEmployee } from '@/lib/employees/types'
import { buildDefaultStagesConfig } from '@/lib/reviews/demoData'
import type {
  CycleGroup,
  ReviewCycle,
  ReviewPacket,
} from '@/lib/reviews/types'
import * as reviewsStore from '@/lib/reviews/store'
import { CycleGroupsSection } from './CycleGroupsSection'

const { employeesState, packetsState } = vi.hoisted(() => ({
  employeesState: {
    employees: [] as PlatformEmployee[],
    loadState: 'ready' as const,
    loadError: null as string | null,
    isLoading: false,
    reload: vi.fn(async () => {}),
  },
  packetsState: {
    packets: [] as ReviewPacket[],
  },
}))

vi.mock('@/lib/employees/useEmployees', () => ({
  useEmployees: () => employeesState,
}))

vi.mock('@/lib/reviews/packetsApi', () => ({
  fetchReviewPacketSummaries: vi.fn(async () => packetsState.packets),
}))

function renderSection(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  })
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  )
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
})

afterEach(() => {
  cleanup()
  employeesState.employees = []
  packetsState.packets = []
  localStorage.removeItem('cycle-people-eligibility-visible-columns-v4')
  vi.restoreAllMocks()
})

function person(
  employeeId: number,
  fields: Partial<PlatformEmployee> = {},
): PlatformEmployee {
  return {
    employeeId,
    fullName: `Person ${employeeId}`,
    email: `person.${employeeId}@example.com`,
    startDate: '2024-01-01',
    jobTitle: 'Engineer',
    department: 'Technology',
    team: 'Core',
    division: 'FundedNext',
    reportsToName: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: 'IC1',
    site: '',
    avatarUrl: '',
    managerEmail: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...fields,
  }
}

function sampleGroup(overrides: Partial<CycleGroup> = {}): CycleGroup {
  const startDate = '2026-07-01'
  const endDate = '2026-09-30'
  const stagesConfig = buildDefaultStagesConfig(startDate, endDate)
  const settings = {
    reviewTypes: {
      line_manager: true,
      self: false,
      upwards: false,
      peer: false,
      functional_manager: false,
    },
    excludedEmployeeIds: [] as number[],
    autoScorecardGeneration: true,
  }
  const calibration = {
    calibrationMode: 'department' as const,
    gradeRecommendation: 'manager_average' as const,
    gradeDistribution: {
      exceptional: 5,
      exceeding: 15,
      performing: 60,
      developing: 15,
      unsatisfactory: 5,
    },
  }
  return {
    id: 'group-1',
    cycleId: 'cycle-1',
    name: 'Everyone',
    memberIds: [1],
    settings,
    stagesConfig,
    calibration,
    createdAt: '2026-01-01T00:00:00.000Z',
    version: 1,
    ...overrides,
  }
}

function sampleCycle(groups: CycleGroup[]): ReviewCycle {
  const group = groups[0]
  const startDate = '2026-07-01'
  const endDate = '2026-09-30'
  return {
    id: 'cycle-1',
    name: 'Q3 2026',
    type: 'regular',
    startDate,
    endDate,
    stagesConfig: group?.stagesConfig ?? buildDefaultStagesConfig(startDate, endDate),
    settings: group?.settings ?? {
      reviewTypes: {
        line_manager: true,
        self: false,
        upwards: false,
        peer: false,
        functional_manager: false,
      },
      excludedEmployeeIds: [],
      autoScorecardGeneration: true,
    },
    calibration: group?.calibration ?? {
      calibrationMode: 'department',
      gradeRecommendation: 'manager_average',
      gradeDistribution: {
        exceptional: 5,
        exceeding: 15,
        performing: 60,
        developing: 15,
        unsatisfactory: 5,
      },
    },
    groups,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('CycleGroupsSection', () => {
  it('lists groups as cards with people counts', () => {
    renderSection(
      <CycleGroupsSection
        cycle={sampleCycle([sampleGroup(), sampleGroup({ id: 'group-2', name: 'New group', memberIds: [] })])}
        onAddGroup={() => {}}
        onDelete={() => {}}
        onOpenGroup={() => {}}
      />,
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'People In This Cycle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Everyone' })).toHaveTextContent('1 person')
    expect(screen.getByRole('button', { name: 'New group' })).toHaveTextContent('0 people')
    expect(screen.getByRole('button', { name: 'Create New Group' })).toBeInTheDocument()
  })

  it('shows every person with their cycle assignment', () => {
    employeesState.employees = [
      person(1, {
        fullName: 'Included Person',
        avatarUrl: 'https://cdn.example.com/included.png',
      }),
      person(2, {
        fullName: 'Excluded Person',
        reportsToId: 1,
        reportsToName: 'Included Person',
      }),
    ]

    renderSection(
      <CycleGroupsSection
        cycle={sampleCycle([sampleGroup()])}
        onAddGroup={() => {}}
        onDelete={() => {}}
        onOpenGroup={() => {}}
      />,
    )

    expect(
      screen.getByRole('columnheader', { name: /^Employee/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /^Cycle Assignment/ }),
    ).toBeInTheDocument()
    const includedAssignment = screen.getByRole('button', {
      name: 'Cycle group for Included Person',
    })
    const excludedAssignment = screen.getByRole('button', {
      name: 'Cycle group for Excluded Person',
    })
    const excludedRow = excludedAssignment.closest('tr')
    expect(includedAssignment).toHaveTextContent('Everyone')
    expect(excludedAssignment).toHaveTextContent('Not included')
    expect(excludedRow).not.toBeNull()
    expect(
      within(excludedRow as HTMLTableRowElement).getByRole(
        'img',
        { name: 'Included Person' },
      ),
    ).toBeInTheDocument()
  })

  it('lets people choose which columns are visible', () => {
    renderSection(
      <CycleGroupsSection
        cycle={sampleCycle([sampleGroup()])}
        onAddGroup={() => {}}
        onDelete={() => {}}
        onOpenGroup={() => {}}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /^Columns/ }),
    )
    expect(
      screen.getByRole('option', { name: 'Seniority' }),
    ).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('option', { name: 'Cycle' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    fireEvent.click(screen.getByRole('option', { name: 'Cycle Assignment' }))

    expect(
      screen.queryByRole('columnheader', { name: /^Cycle Assignment/ }),
    ).not.toBeInTheDocument()
  })

  it('filters the people table from its column headers', () => {
    employeesState.employees = [
      person(1, { fullName: 'Core Person', team: 'Core' }),
      person(2, { fullName: 'Growth Person', team: 'Growth' }),
    ]

    renderSection(
      <CycleGroupsSection
        cycle={sampleCycle([sampleGroup()])}
        onAddGroup={() => {}}
        onDelete={() => {}}
        onOpenGroup={() => {}}
      />,
    )

    const table = screen.getByRole('table')
    expect(within(table).getByRole('button', { name: 'Filter Employee' }))
      .toBeInTheDocument()
    fireEvent.click(within(table).getByRole('button', { name: 'Filter Team' }))
    fireEvent.click(screen.getByRole('option', { name: 'Core' }))

    expect(
      within(table).getByRole('button', {
        name: 'Filter Team, 1 selected',
      }),
    ).toHaveClass('is-active')
    expect(within(table).getByText('Core Person')).toBeInTheDocument()
    expect(within(table).queryByText('Growth Person')).not.toBeInTheDocument()
  })

  it('bulk assigns the filtered people to a cycle group', async () => {
    employeesState.employees = [
      person(2, {
        fullName: 'Ops One',
        department: 'Operations',
      }),
      person(3, {
        fullName: 'Ops Two',
        department: 'Operations',
      }),
      person(4, {
        fullName: 'Tech Person',
        department: 'Technology',
      }),
    ]
    const updatedGroup = sampleGroup({ memberIds: [1, 2, 3] })
    const updateGroup = vi
      .spyOn(reviewsStore, 'updateCycleGroup')
      .mockResolvedValue(updatedGroup)

    renderSection(
      <CycleGroupsSection
        cycle={sampleCycle([sampleGroup()])}
        onAddGroup={() => {}}
        onDelete={() => {}}
        onOpenGroup={() => {}}
      />,
    )

    const table = screen.getByRole('table')
    fireEvent.click(
      within(table).getByRole('button', { name: 'Filter Department' }),
    )
    fireEvent.click(screen.getByRole('option', { name: 'Operations' }))
    fireEvent.click(
      within(table).getByRole('checkbox', {
        name: 'Select all visible people',
      }),
    )

    expect(screen.getByText('2 people selected')).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Assign selected people to a cycle group',
      }),
    )
    fireEvent.click(screen.getByRole('option', { name: 'Everyone' }))

    await waitFor(() => {
      expect(updateGroup).toHaveBeenCalledWith('cycle-1', 'group-1', {
        memberIds: [1, 2, 3],
      })
    })
    expect(screen.queryByText('2 people selected')).not.toBeInTheDocument()
  })

  it('assigns a person to a cycle group from the table', async () => {
    employeesState.employees = [person(2, { fullName: 'Excluded Person' })]
    const updatedGroup = sampleGroup({ memberIds: [1, 2] })
    const updateGroup = vi
      .spyOn(reviewsStore, 'updateCycleGroup')
      .mockResolvedValue(updatedGroup)

    renderSection(
      <CycleGroupsSection
        cycle={sampleCycle([sampleGroup()])}
        onAddGroup={() => {}}
        onDelete={() => {}}
        onOpenGroup={() => {}}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cycle group for Excluded Person',
      }),
    )
    fireEvent.click(screen.getByRole('option', { name: 'Everyone' }))

    await waitFor(() => {
      expect(updateGroup).toHaveBeenCalledWith('cycle-1', 'group-1', {
        memberIds: [1, 2],
      })
    })
  })

  it('creates a group from the last dropdown option', () => {
    employeesState.employees = [person(2, { fullName: 'Excluded Person' })]
    const onAddGroup = vi.fn()

    renderSection(
      <CycleGroupsSection
        cycle={sampleCycle([sampleGroup()])}
        onAddGroup={onAddGroup}
        onDelete={() => {}}
        onOpenGroup={() => {}}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cycle group for Excluded Person',
      }),
    )
    fireEvent.click(
      screen.getByRole('option', { name: 'Create New Group' }),
    )

    expect(onAddGroup).toHaveBeenCalledOnce()
  })

  it('hides and reveals every grade together', async () => {
    employeesState.employees = [
      person(1, { fullName: 'Graded Person' }),
      person(2, { fullName: 'Published Grade Person' }),
    ]
    packetsState.packets = [
      {
        employeeId: 1,
        status: 'manager_submitted',
        publishedOverallGrade: null,
        calibratedOverallGrade: null,
        managerOverallGrade: 'performing',
        selfOverallGrade: null,
      } as ReviewPacket,
      {
        employeeId: 2,
        status: 'released_to_employees',
        publishedOverallGrade: 'exceeding',
        calibratedOverallGrade: null,
        managerOverallGrade: null,
        selfOverallGrade: null,
      } as ReviewPacket,
    ]

    renderSection(
      <CycleGroupsSection
        cycle={sampleCycle([sampleGroup()])}
        onAddGroup={() => {}}
        onDelete={() => {}}
        onOpenGroup={() => {}}
      />,
    )

    await screen.findByRole('button', {
      name: "Show Graded Person's grade",
    })
    expect(
      screen.getByRole('button', {
        name: "Show Published Grade Person's grade",
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show All Grades' }))
    expect(screen.getByText('Performing')).toBeInTheDocument()
    expect(screen.getByText('Exceeding')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: "Hide Graded Person's grade" }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hide All Grades' }))
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: "Show Graded Person's grade" }),
      ).toBeInTheDocument()
    })
    fireEvent.click(
      screen.getByRole('button', { name: "Show Graded Person's grade" }),
    )
    expect(screen.getByText('Performing')).toBeInTheDocument()
    expect(screen.queryByText('Exceeding')).not.toBeInTheDocument()
  })

  it('opens a group from its card', () => {
    const onOpenGroup = vi.fn()
    renderSection(
      <CycleGroupsSection
        cycle={sampleCycle([sampleGroup()])}
        onAddGroup={() => {}}
        onDelete={() => {}}
        onOpenGroup={onOpenGroup}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Everyone' }))
    expect(onOpenGroup).toHaveBeenCalledWith('group-1')
  })

  it('adds a group from the dashed card', () => {
    const onAddGroup = vi.fn()
    renderSection(
      <CycleGroupsSection
        cycle={sampleCycle([sampleGroup()])}
        onAddGroup={onAddGroup}
        onDelete={() => {}}
        onOpenGroup={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create New Group' }))
    expect(onAddGroup).toHaveBeenCalled()
  })

  it('confirms before deleting a group', () => {
    const onDelete = vi.fn()
    renderSection(
      <CycleGroupsSection
        cycle={sampleCycle([sampleGroup()])}
        onAddGroup={() => {}}
        onDelete={onDelete}
        onOpenGroup={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete Everyone' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Group' }))
    expect(onDelete).toHaveBeenCalledWith('group-1')
  })

  it('offers a first-group action when the cycle has none', () => {
    const onAddGroup = vi.fn()
    renderSection(
      <CycleGroupsSection
        cycle={sampleCycle([])}
        onAddGroup={onAddGroup}
        onDelete={() => {}}
        onOpenGroup={() => {}}
      />,
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.queryByText('No one is in this cycle yet')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create New Group' }))
    expect(onAddGroup).toHaveBeenCalled()
  })
})

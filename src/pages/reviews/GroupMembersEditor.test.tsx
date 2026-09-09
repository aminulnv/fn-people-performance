import { useState, type ReactElement } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { PlatformEmployee } from '@/lib/employees/types'
import { GroupMembersEditor } from './GroupMembersEditor'

const { employeesState } = vi.hoisted(() => ({
  employeesState: {
    employees: [] as PlatformEmployee[],
    loadState: 'ready' as const,
    loadError: null as string | null,
    isLoading: false,
    reload: vi.fn(async () => { }),
  },
}))

vi.mock('@/lib/employees/useEmployees', async () => {
  const { buildOrganisationFromEmployees } = await import(
    '@/lib/organisation/fromEmployees'
  )
  return {
    useEmployees: () => employeesState,
    useOrganisation: () => ({
      ...employeesState,
      organisation: buildOrganisationFromEmployees(employeesState.employees),
    }),
  }
})

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
})

function person(
  id: number,
  fields: Partial<PlatformEmployee> = {},
): PlatformEmployee {
  return {
    employeeId: id,
    fullName: `Person ${String(id).padStart(3, '0')}`,
    email: `person.${id}@example.com`,
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
    avatarUrl: `https://cdn.example.com/${id}.png`,
    managerEmail: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...fields,
  }
}

function renderEditor(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

function filterBox(name = 'Search people') {
  return screen.getByRole('searchbox', { name })
}

function chooseColumnFilter(label: string, option: string) {
  fireEvent.click(screen.getByRole('button', { name: `Filter ${label}` }))
  fireEvent.click(screen.getByRole('option', { name: option }))
  fireEvent.keyDown(document, { key: 'Escape' })
}

function addPerson(name: string) {
  fireEvent.click(
    screen.getByRole('button', { name: new RegExp(`^select ${name}`, 'i') }),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Add 1 person' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add people' }))
}

function openSelected() {
  fireEvent.click(
    within(screen.getByRole('group', { name: 'People selection view' })).getByRole(
      'button',
      { name: /^added/i },
    ),
  )
}

function openBrowse() {
  fireEvent.click(
    within(screen.getByRole('group', { name: 'People selection view' })).getByRole(
      'button',
      { name: /^not added/i },
    ),
  )
}

function addedTab() {
  return within(
    screen.getByRole('group', { name: 'People selection view' }),
  ).getByRole('button', { name: /^added/i })
}

function Harness({ initialIds = [] }: { initialIds?: number[] }) {
  const [memberIds, setMemberIds] = useState(initialIds)
  return (
    <GroupMembersEditor memberIds={memberIds} onChange={setMemberIds} />
  )
}

function FailingSaveHarness() {
  const [memberIds, setMemberIds] = useState<number[]>([])
  return (
    <GroupMembersEditor
      memberIds={memberIds}
      onChange={async (nextIds) => {
        setMemberIds(nextIds)
        await Promise.resolve()
        setMemberIds([])
        throw new Error('People could not be saved.')
      }}
    />
  )
}

afterEach(() => {
  cleanup()
  employeesState.employees = []
})

describe('GroupMembersEditor', () => {
  it('shows people in a table with filterable name and department columns', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed' }),
      person(2, { fullName: 'Tanzim Hasan Fahim' }),
    ]

    renderEditor(<Harness />)
    expect(addedTab()).toHaveTextContent('0')
    expect(
      within(screen.getByRole('group', { name: 'People selection view' })).getByRole(
        'button',
        { name: /^not added/i },
      ),
    ).toBeInTheDocument()

    openBrowse()
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /department/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /team/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Filter Name' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Filter Department' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Filter Team' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^select sheikh syed ahmed/i }),
    ).toBeInTheDocument()

    addPerson('Sheikh Syed Ahmed')
    expect(addedTab()).toHaveTextContent('1')

    openSelected()
    expect(screen.getByText('Sheikh Syed Ahmed')).toBeInTheDocument()
  })

  it('selects all visible people from the header checkbox', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed' }),
      person(2, { fullName: 'Tanzim Hasan Fahim' }),
    ]

    renderEditor(<Harness />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all people' }))

    expect(
      screen.getByRole('checkbox', { name: 'Clear all people' }),
    ).toBeChecked()
    expect(screen.getByRole('button', { name: 'Add 2 people' })).toBeEnabled()
  })

  it('filters the people table by department', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed', team: 'Core' }),
      person(2, {
        fullName: 'Tanzim Hasan Fahim',
        department: 'Operations',
      }),
    ]

    renderEditor(<Harness />)
    chooseColumnFilter('Department', 'Operations')

    expect(screen.getByText('Tanzim Hasan Fahim')).toBeInTheDocument()
    expect(screen.queryByText('Sheikh Syed Ahmed')).not.toBeInTheDocument()
  })

  it('filters the people table by team', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed', team: 'Core' }),
      person(2, { fullName: 'Tanzim Hasan Fahim', team: 'Platform' }),
    ]

    renderEditor(<Harness />)
    chooseColumnFilter('Team', 'Platform')

    expect(screen.getByText('Tanzim Hasan Fahim')).toBeInTheDocument()
    expect(screen.queryByText('Sheikh Syed Ahmed')).not.toBeInTheDocument()
  })

  it('searches column values and selects all matching options', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed', team: 'Core' }),
      person(2, { fullName: 'Tanzim Hasan Fahim', team: 'Platform' }),
    ]

    renderEditor(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Filter Team' }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search team' }), {
      target: { value: 'Core' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Select all Team values' }),
    )
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.getByText('Sheikh Syed Ahmed')).toBeInTheDocument()
    expect(screen.queryByText('Tanzim Hasan Fahim')).not.toBeInTheDocument()
  })

  it('cancels an add from the confirmation modal', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed' }),
      person(2, { fullName: 'Tanzim Hasan Fahim' }),
      person(3, { fullName: 'Tanvir Zaman' }),
    ]
    const onChange = vi.fn()

    renderEditor(<GroupMembersEditor memberIds={[]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /^select sheikh syed ahmed/i }))

    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 person' }))
    expect(screen.getByRole('dialog', { name: 'Add 1 person?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(addedTab()).toHaveTextContent('0')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('saves an addition when the confirmation modal is confirmed', async () => {
    employeesState.employees = [person(1, { fullName: 'Sheikh Syed Ahmed' })]
    const onChange = vi.fn(async () => { })

    renderEditor(<GroupMembersEditor memberIds={[]} onChange={onChange} />)
    addPerson('Sheikh Syed Ahmed')

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([1]))
    expect(
      screen.queryByRole('dialog', { name: 'Add 1 person?' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the confirmation open and shows an error when adding fails', async () => {
    employeesState.employees = [person(1, { fullName: 'Sheikh Syed Ahmed' })]

    renderEditor(<FailingSaveHarness />)
    addPerson('Sheikh Syed Ahmed')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'People could not be saved.',
    )
    expect(screen.getByRole('dialog', { name: 'Add 1 person?' })).toBeInTheDocument()
    expect(addedTab()).toHaveTextContent('0')
  })

  it('warns in the confirmation when a person will move from another group', () => {
    employeesState.employees = [person(1, { fullName: 'Sheikh Syed Ahmed' })]

    renderEditor(
      <GroupMembersEditor
        memberIds={[]}
        claimedIds={[1]}
        otherGroups={[{ name: 'Existing group', memberIds: [1] }]}
        onChange={() => { }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^select sheikh syed ahmed/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 person' }))

    expect(
      screen.getByText('1 person will move from another group.'),
    ).toBeInTheDocument()
  })

  it('filters the name column', () => {
    employeesState.employees = [
      person(1, {
        fullName: 'Sheikh Syed Ahmed',
        department: 'People and Culture',
      }),
      person(2, {
        fullName: 'Tanzim Hasan Fahim',
        department: 'People and Culture',
      }),
    ]

    renderEditor(<Harness />)
    openBrowse()
    fireEvent.change(filterBox(), { target: { value: 'Sheikh' } })

    expect(screen.getByText('Sheikh Syed Ahmed')).toBeInTheDocument()
    expect(screen.queryByText('Tanzim Hasan Fahim')).not.toBeInTheDocument()
  })

  it('shows department values in a separate column', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed', team: 'Core' }),
      person(2, { fullName: 'Tanzim Hasan Fahim', team: 'Core' }),
    ]

    renderEditor(<Harness />)
    openBrowse()
    const row = screen.getByText('Sheikh Syed Ahmed').closest('tr')
    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).getByText('Technology')).toBeInTheDocument()
    expect(within(row as HTMLElement).getByText('Core')).toBeInTheDocument()
  })

  it('shows only people not already added in the Not added tab', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed', department: 'Technology' }),
      person(2, { fullName: 'Tanzim Hasan Fahim', department: 'Technology' }),
      person(3, { fullName: 'Tanvir Zaman', department: 'Operations' }),
    ]

    renderEditor(<Harness initialIds={[1]} />)
    openBrowse()
    expect(screen.queryByText('Sheikh Syed Ahmed')).not.toBeInTheDocument()
    addPerson('Tanzim Hasan Fahim')

    openSelected()
    expect(screen.getByText('Sheikh Syed Ahmed')).toBeInTheDocument()
    expect(screen.getByText('Tanzim Hasan Fahim')).toBeInTheDocument()
    expect(screen.queryByText('Tanvir Zaman')).not.toBeInTheDocument()
  })

  it('removes checked members in the in-group pane', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed' }),
      person(2, { fullName: 'Tanzim Hasan Fahim' }),
    ]

    renderEditor(<Harness initialIds={[1]} />)
    openSelected()

    fireEvent.click(screen.getByRole('button', { name: 'Select Sheikh Syed Ahmed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove 1 person' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove people' }))

    expect(screen.getByText('No one selected yet')).toBeInTheDocument()
  })

  it('removes a member from the per-row remove control', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed' }),
      person(2, { fullName: 'Tanzim Hasan Fahim' }),
    ]

    renderEditor(<Harness initialIds={[1, 2]} />)
    openSelected()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Sheikh Syed Ahmed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove people' }))

    expect(screen.getByText('Tanzim Hasan Fahim')).toBeInTheDocument()
    expect(screen.queryByText('Sheikh Syed Ahmed')).not.toBeInTheDocument()
  })

  it('shows each person’s department without team aggregation', () => {
    employeesState.employees = [
      person(1, {
        fullName: 'Syed Abdullah Jayed',
        department: 'Management',
        team: 'Core',
      }),
      person(2, {
        fullName: 'Syed Abdullah Galib',
        department: 'Management',
        team: 'Core',
      }),
      person(3, {
        fullName: 'Tanzim Hasan Fahim',
        department: 'Technology',
        team: 'Core',
      }),
      person(4, {
        fullName: 'Md. Abdullah Al Monaem',
        department: 'Operations',
        team: 'Core',
      }),
    ]

    renderEditor(<Harness />)
    openBrowse()
    expect(screen.getAllByRole('cell', { name: 'Management' })).toHaveLength(2)
    expect(screen.getByRole('cell', { name: 'Technology' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Operations' })).toBeInTheDocument()
  })

  it('keeps the people-only picker compatible with column filters', () => {
    employeesState.employees = [
      person(1, { fullName: 'Jayed Sarker', department: 'Leadership' }),
    ]

    renderEditor(
      <GroupMembersEditor
        memberIds={[]}
        onChange={() => { }}
        searchLabel="Add Senior Leaders"
        placeholder="Add a person…"
        peopleOnly
      />,
    )

    openBrowse()
    expect(screen.getByRole('searchbox', { name: 'Add Senior Leaders' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^select jayed sarker/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Filter Department' }),
    ).toBeInTheDocument()

    fireEvent.change(filterBox('Add Senior Leaders'), { target: { value: 'Nobody' } })
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('filters members already in the group', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed' }),
      person(2, { fullName: 'Tanzim Hasan Fahim' }),
    ]

    renderEditor(<Harness initialIds={[1, 2]} />)
    openSelected()
    fireEvent.change(filterBox(), { target: { value: 'Tanzim' } })

    expect(screen.getByText('Tanzim Hasan Fahim')).toBeInTheDocument()
    expect(screen.queryByText('Sheikh Syed Ahmed')).not.toBeInTheDocument()
  })

  it('shows a large people list directly without collapsed sections', () => {
    employeesState.employees = Array.from({ length: 40 }, (_, index) =>
      person(index + 1, {
        fullName: `Bulk Person ${index + 1}`,
        department: 'Technology',
        team: 'Core',
      }),
    )

    renderEditor(<Harness />)
    openBrowse()

    expect(
      screen.getByRole('button', { name: /^select bulk person 1$/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show 40 people' })).not.toBeInTheDocument()
  })
})

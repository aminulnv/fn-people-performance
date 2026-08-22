import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { PlatformEmployee } from '@/lib/employees/types'
import { GroupMembersEditor } from './GroupMembersEditor'

const { employeesState } = vi.hoisted(() => ({
  employeesState: {
    employees: [] as PlatformEmployee[],
    loadState: 'ready' as const,
    loadError: null as string | null,
    isLoading: false,
    reload: vi.fn(async () => {}),
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

function Harness({ initialIds = [] }: { initialIds?: number[] }) {
  const [memberIds, setMemberIds] = useState(initialIds)
  return (
    <GroupMembersEditor memberIds={memberIds} onChange={setMemberIds} />
  )
}

afterEach(() => {
  cleanup()
  employeesState.employees = []
})

describe('GroupMembersEditor', () => {
  it('keeps picker checks pending until Confirm', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed' }),
      person(2, { fullName: 'Tanzim Hasan Fahim' }),
    ]

    render(<Harness />)
    fireEvent.focus(screen.getByRole('combobox', { name: 'Add people to this group' }))

    const picker = screen.getByRole('listbox', { name: 'People to add' })
    expect(within(picker).getByRole('img', { name: 'Sheikh Syed Ahmed' })).toBeInTheDocument()

    fireEvent.click(
      within(picker).getByRole('option', { name: /Sheikh Syed Ahmed/ }),
    )

    expect(
      within(picker).getByRole('option', { name: /Sheikh Syed Ahmed/ }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.queryByRole('button', { name: 'Remove Sheikh Syed Ahmed' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(
      screen.getByRole('button', { name: 'Remove Sheikh Syed Ahmed' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('listbox', { name: 'People to add' })).not.toBeInTheDocument()
  })

  it('selects every visible person and only adds them after Confirm', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed' }),
      person(2, { fullName: 'Tanzim Hasan Fahim' }),
      person(3, { fullName: 'Tanvir Zaman' }),
    ]

    render(<Harness />)
    fireEvent.focus(screen.getByRole('combobox', { name: 'Add people to this group' }))
    fireEvent.click(screen.getByRole('button', { name: 'Select All' }))

    expect(screen.getByText('3 people selected')).toBeInTheDocument()
    expect(screen.getByText('Search to add people')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear All' }))
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Select All' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(screen.getByLabelText('Remove Sheikh Syed Ahmed')).toBeInTheDocument()
    expect(screen.getByLabelText('Remove Tanzim Hasan Fahim')).toBeInTheDocument()
    expect(screen.getByLabelText('Remove Tanvir Zaman')).toBeInTheDocument()
  })

  it('removes a person from the group while the picker is open', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed' }),
      person(2, { fullName: 'Tanzim Hasan Fahim' }),
    ]

    render(<Harness initialIds={[1]} />)
    fireEvent.focus(screen.getByRole('combobox', { name: 'Add people to this group' }))

    const remove = screen.getByRole('button', { name: 'Remove Sheikh Syed Ahmed' })
    fireEvent.mouseDown(remove)
    fireEvent.click(remove)

    expect(
      screen.queryByRole('button', { name: 'Remove Sheikh Syed Ahmed' }),
    ).not.toBeInTheDocument()
  })

  it('shows each department Core team with that team’s headcount', () => {
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

    render(<Harness />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Add people to this group' }), {
      target: { value: 'Core' },
    })

    const picker = screen.getByRole('listbox', { name: 'People to add' })
    expect(within(picker).getByText('Management · 2 people')).toBeInTheDocument()
    expect(within(picker).getByText('Technology · 1 person')).toBeInTheDocument()
    expect(within(picker).getByText('Operations · 1 person')).toBeInTheDocument()
    expect(within(picker).queryByText(/19 people/)).not.toBeInTheDocument()
  })

  it('does not offer departments when picking people only', () => {
    employeesState.employees = [
      person(1, { fullName: 'Jayed Sarker', department: 'Leadership' }),
    ]

    render(
      <GroupMembersEditor
        memberIds={[]}
        onChange={() => {}}
        searchLabel="Add senior leaders"
        placeholder="Add a person…"
        peopleOnly
      />,
    )
    fireEvent.focus(screen.getByRole('combobox', { name: 'Add senior leaders' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Add senior leaders' }), {
      target: { value: 'Lead' },
    })

    const picker = screen.getByRole('listbox', { name: 'People to add' })
    expect(within(picker).getAllByRole('option')).toHaveLength(1)
    expect(within(picker).getByRole('option', { name: /Jayed Sarker/ })).toBeInTheDocument()
  })

  it('removes checked people in bulk from the member list', () => {
    employeesState.employees = [
      person(1, { fullName: 'Sheikh Syed Ahmed' }),
      person(2, { fullName: 'Tanzim Hasan Fahim' }),
      person(3, { fullName: 'Tanvir Zaman' }),
    ]

    render(<Harness initialIds={[1, 2, 3]} />)

    expect(
      screen.queryByRole('button', { name: /Remove \d+ people|Remove 1 person/ }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Select Tanzim Hasan Fahim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Select Tanvir Zaman' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove 2 people' }))

    expect(screen.getByLabelText('Remove Sheikh Syed Ahmed')).toBeInTheDocument()
    expect(screen.queryByLabelText('Remove Tanzim Hasan Fahim')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Remove Tanvir Zaman')).not.toBeInTheDocument()
  })
})

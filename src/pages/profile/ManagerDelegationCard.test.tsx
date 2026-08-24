import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { clearSession, writeSession } from '@/lib/authApi'
import {
  assignManagerDelegationLocal,
  resetManagerDelegationsForTests,
} from '@/lib/delegations/store'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  ManagerDelegationAssignModal,
  ManagerDelegationStatusCard,
  useManagerDelegationEditor,
} from './ManagerDelegationCard'

function ManagerDelegationHarness({
  employee,
  employees,
  hasDirectReports,
}: {
  employee: PlatformEmployee
  employees: PlatformEmployee[]
  hasDirectReports: boolean
}) {
  const editor = useManagerDelegationEditor({
    employee,
    employees,
    hasDirectReports,
  })
  return (
    <>
      {editor.canManage ? (
        <button type="button" onClick={editor.openAssign}>
          {editor.assignLabel}
        </button>
      ) : null}
      {editor.canRevoke ? (
        <button type="button" onClick={() => void editor.onRevoke()}>
          Revoke Delegation
        </button>
      ) : null}
      <ManagerDelegationStatusCard editor={editor} />
      <ManagerDelegationAssignModal editor={editor} />
    </>
  )
}

function employee(
  partial: Pick<PlatformEmployee, 'employeeId' | 'fullName' | 'email'> &
    Partial<PlatformEmployee>,
): PlatformEmployee {
  return {
    startDate: '2020-01-01',
    jobTitle: 'Manager',
    department: 'Product',
    team: '',
    division: '',
    reportsToName: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: '',
    site: '',
    avatarUrl: '',
    managerEmail: '',
    isActive: true,
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    ...partial,
  }
}

const manager = employee({
  employeeId: 2,
  fullName: 'Line Manager',
  email: 'manager@example.com',
})
const delegate = employee({
  employeeId: 4,
  fullName: 'Peer Manager',
  email: 'delegate@example.com',
})

function signIn(permissions: ('platform.write_all' | 'platform.read_all')[]) {
  writeSession({
    user: {
      id: '1',
      email: 'admin@example.com',
      name: 'Admin',
      personId: '1',
      permissions,
      title: 'Admin',
    },
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

describe('ManagerDelegationCard', () => {
  beforeEach(() => {
    clearSession()
    resetManagerDelegationsForTests()
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open')
    }
  })

  afterEach(() => {
    cleanup()
    clearSession()
    resetManagerDelegationsForTests()
  })

  it('lets a write admin assign a delegation on a manager profile', async () => {
    signIn(['platform.write_all'])
    render(
      <AuthProvider>
        <ManagerDelegationHarness
          employee={manager}
          employees={[manager, delegate]}
          hasDirectReports
        />
      </AuthProvider>,
    )

    expect(
      await screen.findByRole('button', { name: 'Assign Delegation' }),
    ).toBeTruthy()
  })

  it('shows who the manager is delegated to', async () => {
    assignManagerDelegationLocal({
      absentEmployeeId: 2,
      delegateEmployeeId: 4,
      startsOn: '2020-01-01',
      endsOn: '2030-01-01',
      absentName: 'Line Manager',
      delegateName: 'Peer Manager',
      assignedByEmployeeId: 1,
      assignedByName: 'Admin',
    })
    signIn(['platform.write_all'])
    render(
      <AuthProvider>
        <ManagerDelegationHarness
          employee={manager}
          employees={[manager, delegate]}
          hasDirectReports
        />
      </AuthProvider>,
    )

    expect(await screen.findByText(/Delegated to/)).toHaveTextContent(
      'Peer Manager',
    )
    expect(
      screen.getByRole('button', { name: 'Revoke Delegation' }),
    ).toBeTruthy()
  })

  it('hides assign actions without write access', async () => {
    assignManagerDelegationLocal({
      absentEmployeeId: 2,
      delegateEmployeeId: 4,
      startsOn: '2020-01-01',
      endsOn: '2030-01-01',
      absentName: 'Line Manager',
      delegateName: 'Peer Manager',
      assignedByEmployeeId: 1,
      assignedByName: 'Admin',
    })
    signIn(['platform.read_all'])
    render(
      <AuthProvider>
        <ManagerDelegationHarness
          employee={manager}
          employees={[manager, delegate]}
          hasDirectReports
        />
      </AuthProvider>,
    )

    expect(await screen.findByText(/Delegated to/)).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Assign Delegation' }),
    ).toBeNull()
  })

  it('lets a write admin search people in the delegate picker', async () => {
    const other = employee({
      employeeId: 8,
      fullName: 'Other Person',
      email: 'other@example.com',
      jobTitle: 'Designer',
    })
    signIn(['platform.write_all'])
    render(
      <AuthProvider>
        <ManagerDelegationHarness
          employee={manager}
          employees={[manager, delegate, other]}
          hasDirectReports
        />
      </AuthProvider>,
    )

    fireEvent.click(
      await screen.findByRole('button', { name: 'Assign Delegation' }),
    )
    expect(
      screen.getByText("Delegate Line Manager's responsibility"),
    ).toBeTruthy()
    expect(
      screen.queryByText(/acts as this manager for their reports/),
    ).toBeNull()
    fireEvent.mouseEnter(
      screen.getByRole('button', { name: 'What a delegation does' }),
    )
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'acts as this manager for their reports',
    )
    fireEvent.change(screen.getByRole('combobox', { name: 'Delegate to' }), {
      target: { value: 'Peer' },
    })

    expect(screen.getByRole('option', { name: /Peer Manager/ })).toBeTruthy()
    expect(screen.queryByRole('option', { name: /Other Person/ })).toBeNull()
  })
})

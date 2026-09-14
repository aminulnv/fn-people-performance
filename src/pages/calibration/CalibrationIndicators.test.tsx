import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { CalibrationIndicator } from '@/lib/calibration/indicators'
import type { PlatformEmployee } from '@/lib/employees/types'
import { CalibrationIndicators } from './CalibrationIndicators'

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
})

const indicators: CalibrationIndicator[] = [
  {
    id: 'two_cycles_exceeding',
    title: '2 consecutive cycles exceeding & above',
    definition: 'Exceeding in this cycle and the previous one.',
    tone: 'positive',
    count: 2,
    employeeIds: [1, 2],
  },
  {
    id: 'dropped_two_tiers',
    title: 'Dropped 2+ tiers from previous cycle',
    definition: 'Fell by two or more bands.',
    tone: 'warning',
    count: 0,
    employeeIds: [],
  },
]

const employees: PlatformEmployee[] = [
  {
    employeeId: 1,
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    startDate: '2020-01-01',
    jobTitle: 'Engineer',
    department: 'Product',
    team: 'Core',
    division: '',
    reportsToName: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: 'IC2',
    site: 'NEXT UAE',
    avatarUrl: '',
    managerEmail: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    employeeId: 2,
    fullName: 'Grace Hopper',
    email: 'grace@example.com',
    startDate: '2020-01-01',
    jobTitle: 'Manager',
    department: 'Engineering',
    team: 'Platform',
    division: '',
    reportsToName: '',
    departmentHeadName: '',
    hrbpName: '',
    jobGrade: 'M1',
    site: 'NEXT UAE',
    avatarUrl: '',
    managerEmail: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
]

describe('CalibrationIndicators', () => {
  it('renders cards with info hints and opens the employee list', () => {
    render(
      <CalibrationIndicators indicators={indicators} employees={employees} />,
    )

    expect(
      screen.getByRole('heading', { name: /Calibration Indicators/i }),
    ).toBeTruthy()
    expect(
      screen.getByLabelText(/About 2 consecutive cycles exceeding & above/i),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: /2 consecutive cycles exceeding & above: 2 people/i,
      }),
    )

    expect(screen.getByText('Ada Lovelace')).toBeTruthy()
    expect(screen.getByText('Grace Hopper')).toBeTruthy()
  })
})

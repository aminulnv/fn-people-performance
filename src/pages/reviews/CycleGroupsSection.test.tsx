import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { buildDefaultStagesConfig } from '@/lib/reviews/demoData'
import type { CycleGroup, ReviewCycle } from '@/lib/reviews/types'
import { CycleGroupsSection } from './CycleGroupsSection'

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
  it('lists groups in a table with shared stage columns', () => {
    render(
      <CycleGroupsSection
        cycle={sampleCycle([sampleGroup(), sampleGroup({ id: 'group-2', name: 'New group', memberIds: [] })])}
        onAddGroup={() => {}}
        onDelete={() => {}}
        onOpenGroup={() => {}}
      />,
    )

    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Group' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'People' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Goals' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Review flow' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Window' })).toBeInTheDocument()
    expect(screen.getByText('1 person')).toBeInTheDocument()
    expect(screen.getByText('0 people')).toBeInTheDocument()
  })

  it('opens a group from its name', () => {
    const onOpenGroup = vi.fn()
    render(
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

  it('confirms before deleting a group', () => {
    const onDelete = vi.fn()
    render(
      <CycleGroupsSection
        cycle={sampleCycle([sampleGroup()])}
        onAddGroup={() => {}}
        onDelete={onDelete}
        onOpenGroup={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete Everyone' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete group' }))
    expect(onDelete).toHaveBeenCalledWith('group-1')
  })

  it('offers a first-group action when the cycle has none', () => {
    const onAddGroup = vi.fn()
    render(
      <CycleGroupsSection
        cycle={sampleCycle([])}
        onAddGroup={onAddGroup}
        onDelete={() => {}}
        onOpenGroup={() => {}}
      />,
    )

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create first group' }))
    expect(onAddGroup).toHaveBeenCalled()
  })
})

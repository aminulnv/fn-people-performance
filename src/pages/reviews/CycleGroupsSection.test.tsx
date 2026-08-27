import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
  it('lists groups as cards with people counts', () => {
    render(
      <CycleGroupsSection
        cycle={sampleCycle([sampleGroup(), sampleGroup({ id: 'group-2', name: 'New group', memberIds: [] })])}
        onAddGroup={() => {}}
        onDelete={() => {}}
        onOpenGroup={() => {}}
      />,
    )

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'People in this cycle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Everyone' })).toHaveTextContent('1 person')
    expect(screen.getByRole('button', { name: 'New group' })).toHaveTextContent('0 people')
    expect(screen.getByRole('button', { name: 'Create new group' })).toBeInTheDocument()
  })

  it('opens a group from its card', () => {
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

  it('adds a group from the dashed card', () => {
    const onAddGroup = vi.fn()
    render(
      <CycleGroupsSection
        cycle={sampleCycle([sampleGroup()])}
        onAddGroup={onAddGroup}
        onDelete={() => {}}
        onOpenGroup={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create new group' }))
    expect(onAddGroup).toHaveBeenCalled()
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
    expect(screen.queryByText('No one is in this cycle yet')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create new group' }))
    expect(onAddGroup).toHaveBeenCalled()
  })
})

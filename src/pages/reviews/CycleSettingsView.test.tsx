import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { buildDefaultStagesConfig } from '@/lib/reviews/demoData'
import * as reviewsStore from '@/lib/reviews/store'
import type { ReviewCycle } from '@/lib/reviews/types'
import { CycleSettingsView } from './CycleSettingsView'

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

function sampleCycle(): ReviewCycle {
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
    goalCountPolicy: {
      minimumRequired: 3,
      recommendedMinimum: 4,
      recommendedMaximum: 6,
      maximumAllowed: null,
    },
    postWindowGoalPolicy: 'hard_stop' as const,
    excludedEmployeeIds: [],
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
    id: 'cycle-1',
    name: 'Q3 2026',
    type: 'regular',
    startDate,
    endDate,
    stagesConfig,
    settings,
    calibration,
    groups: [
      {
        id: 'group-1',
        cycleId: 'cycle-1',
        name: 'Everyone',
        memberIds: [1],
        settings,
        stagesConfig,
        calibration,
        createdAt: '2026-01-01T00:00:00.000Z',
        version: 1,
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('CycleSettingsView', () => {
  it('opens cycle details in a right panel and keeps the overview visible', () => {
    render(<CycleSettingsView cycle={sampleCycle()} />)

    fireEvent.click(
      within(screen.getByRole('region', { name: 'Cycle details' })).getByRole(
        'button',
        { name: 'Edit' },
      ),
    )

    expect(screen.getByRole('dialog', { name: 'Cycle details' })).toBeInTheDocument()
    expect(screen.getByLabelText('Cycle name')).toBeInTheDocument()
    expect(screen.queryByText('How stages advance')).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Group' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Groups' })).toBeInTheDocument()
  })

  it('opens group settings in a right panel', () => {
    render(<CycleSettingsView cycle={sampleCycle()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Everyone' }))

    expect(screen.getByRole('dialog', { name: 'Everyone' })).toBeInTheDocument()
    expect(screen.getByLabelText('Group name')).toHaveValue('Everyone')
    expect(
      screen.getByRole('dialog', { name: 'Everyone' }).querySelector(
        '.pd-settings-panel__chrome',
      ),
    ).toContainElement(screen.getByLabelText('Group name'))
    expect(screen.getByRole('heading', { name: 'Groups' })).toBeInTheDocument()
  })

  it('opens the group editor when adding a group', async () => {
    const cycle = sampleCycle()
    const created = {
      ...cycle.groups![0],
      id: 'group-2',
      name: 'New group',
      memberIds: [],
    }
    vi.spyOn(reviewsStore, 'createCycleGroup').mockResolvedValue(created)

    render(<CycleSettingsView cycle={cycle} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add group' }))

    await waitFor(() => {
      expect(reviewsStore.createCycleGroup).toHaveBeenCalledWith(cycle.id, {
        name: 'New group',
      })
    })
    expect(screen.getByRole('dialog', { name: 'New group' })).toBeInTheDocument()
    expect(screen.getByLabelText('Group name')).toHaveValue('New group')
    expect(screen.getByRole('group', { name: 'Group sections' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Groups' })).toBeInTheDocument()
  })
})

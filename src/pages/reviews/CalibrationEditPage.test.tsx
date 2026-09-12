import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { buildDefaultStagesConfig } from '@/lib/reviews/demoData'
import { resetReviewsStoreForTests } from '@/lib/reviews/store'
import type { CycleGroup, ReviewCycle } from '@/lib/reviews/types'
import { CalibrationEditPage } from './CalibrationEditPage'

afterEach(() => {
  cleanup()
  resetReviewsStoreForTests()
})

function sample(): { cycle: ReviewCycle; group: CycleGroup } {
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
  const group: CycleGroup = {
    id: 'group-1',
    cycleId: 'cycle-1',
    name: 'Everyone',
    memberIds: [1],
    settings,
    stagesConfig: buildDefaultStagesConfig('2026-07-01', '2026-09-30'),
    calibration: {
      gradeDistribution: {
        exceptional: 5,
        exceeding: 15,
        performing: 60,
        developing: 15,
        unsatisfactory: 5,
      },
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    version: 1,
  }
  return {
    group,
    cycle: {
      id: 'cycle-1',
      name: 'Q3 2026',
      type: 'regular',
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      stagesConfig: group.stagesConfig,
      settings,
      calibration: group.calibration,
      groups: [group],
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  }
}

describe('CalibrationEditPage', () => {
  it('keeps the calibration section as a placeholder', () => {
    const { cycle, group } = sample()

    render(
      <CalibrationEditPage
        cycle={cycle}
        group={group}
        onClose={() => {}}
      />,
    )

    expect(screen.getByText('Under development')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('switch', { name: 'Enable HOD / HRBP Calibration' }),
    ).not.toBeInTheDocument()
  })
})

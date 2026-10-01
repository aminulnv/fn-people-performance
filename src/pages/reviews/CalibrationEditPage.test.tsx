import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
    stagesConfig: buildDefaultStagesConfig(
      '2026-01-01',
      '2026-12-31',
      'annual_appraisal',
      'annual-2026',
    ),
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
      name: 'Annual 2026',
      type: 'regular',
      periodKey: 'annual-2026',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      stagesConfig: group.stagesConfig,
      settings,
      calibration: group.calibration,
      groups: [group],
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  }
}

describe('CalibrationEditPage', () => {
  it('shows calibration windows and the expected grade mix', () => {
    const { cycle, group } = sample()

    render(
      <CalibrationEditPage
        cycle={cycle}
        group={group}
        onClose={() => {}}
        stagesConfig={group.stagesConfig}
        setStageEnabled={vi.fn()}
        setStageDate={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByText('Calibration window')).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Enable Calibration' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('switch', { name: 'Enable HOD / HRBP Calibration' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('switch', { name: 'Enable SLT Calibration' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Performing' })).toHaveValue('60')
    expect(screen.queryByText('Under development')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Increase Exceptional' }))

    expect(
      screen.getByRole('alert'),
    ).toHaveTextContent('The expected shares must add up to 100%.')
  })
})

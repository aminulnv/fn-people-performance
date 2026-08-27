import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { buildDefaultStagesConfig } from '@/lib/reviews/demoData'
import * as reviewsStore from '@/lib/reviews/store'
import { resetReviewsStoreForTests } from '@/lib/reviews/store'
import type { CycleGroup, ReviewCycle } from '@/lib/reviews/types'
import { CalibrationEditPage } from './CalibrationEditPage'

afterEach(() => {
  cleanup()
  resetReviewsStoreForTests()
  vi.restoreAllMocks()
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
  it('explains every calibration option with an info icon', () => {
    const { cycle, group } = sample()

    render(
      <CalibrationEditPage
        cycle={cycle}
        group={group}
        onClose={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'About Calibrators' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'About Manual' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Department owners' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Central calibration' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Recommendation' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About No recommendation' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Manager average' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Weighted scorecards' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Senior leadership' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'About Distribution' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'About Exceptional' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'About Exceeding' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'About Performing' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'About Developing' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Unsatisfactory' }),
    ).toBeInTheDocument()
  })

  it('notifies the parent after a successful save', () => {
    const { cycle, group } = sample()
    const onSuccess = vi.fn()
    vi.spyOn(reviewsStore, 'updateCycleGroup').mockResolvedValue(group)

    render(
      <CalibrationEditPage
        cycle={cycle}
        group={group}
        onClose={() => {}}
        onSuccess={onSuccess}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSuccess).toHaveBeenCalledWith('Settings saved.')
  })
})

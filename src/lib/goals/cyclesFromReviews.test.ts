import { describe, expect, it } from 'vitest'
import { buildDefaultStagesConfig } from '@/lib/reviews/demoData'
import type { ReviewCycle } from '@/lib/reviews/types'
import {
  goalCycleStatus,
  resolveGoalPhase,
  reviewCycleToGoalsCycle,
} from './cyclesFromReviews'

function cycle(processMode: 'schedule' | 'manual' = 'schedule'): ReviewCycle {
  const stagesConfig = buildDefaultStagesConfig('2026-07-01', '2026-09-30')
  stagesConfig.processMode = processMode
  stagesConfig.goals.employee = {
    startDate: '2026-06-01',
    endDate: '2026-06-30',
  }
  stagesConfig.performance.employeeStart = {
    date: '2026-09-21',
    time: '09:00',
  }
  stagesConfig.performance.managerEnd = {
    date: '2026-10-08',
    time: '17:00',
  }
  return {
    id: '2026-q3',
    name: 'Q3 2026',
    type: 'regular',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    stagesConfig,
    settings: {
      reviewTypes: {
        line_manager: true,
        self: false,
        upwards: false,
        peer: false,
        functional_manager: false,
      },
      excludedEmployeeIds: [],
      autoScorecardGeneration: false,
    },
    calibration: {
      calibrationMode: 'manual',
      gradeRecommendation: 'none',
      gradeDistribution: {
        exceptional: 2,
        exceeding: 25,
        performing: 40,
        developing: 28,
        unsatisfactory: 5,
      },
    },
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('resolveGoalPhase', () => {
  it.each([
    ['2026-05-31', 'not_open'],
    ['2026-06-01', 'window_open'],
    ['2026-06-30', 'window_open'],
    ['2026-07-01', 'hard_lock'],
    ['2026-09-20', 'hard_lock'],
    ['2026-09-21', 'check_in'],
    ['2026-10-08', 'check_in'],
    ['2026-10-09', 'closed'],
  ] as const)('maps %s to %s from configured dates', (date, expected) => {
    expect(
      resolveGoalPhase(cycle(), 'window_open', new Date(`${date}T12:00:00Z`)),
    ).toBe(expected)
  })

  it('uses the explicit phase for manually processed cycles', () => {
    expect(
      reviewCycleToGoalsCycle(
        cycle('manual'),
        'check_in',
        new Date('2026-06-15T12:00:00Z'),
      ).phase,
    ).toBe('check_in')
  })

  it('treats the configured early goal window as part of the current cycle', () => {
    expect(goalCycleStatus(cycle(), new Date('2026-06-15T12:00:00Z'))).toBe(
      'current',
    )
    expect(goalCycleStatus(cycle(), new Date('2026-05-31T12:00:00Z'))).toBe(
      'future',
    )
    expect(goalCycleStatus(cycle(), new Date('2026-10-09T12:00:00Z'))).toBe(
      'previous',
    )
  })
})

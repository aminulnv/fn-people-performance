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

  it('advances by date even when a stored cycle is marked manual', () => {
    expect(
      resolveGoalPhase(
        cycle('manual'),
        'check_in',
        new Date('2026-06-15T12:00:00Z'),
      ),
    ).toBe('window_open')
    expect(
      goalCycleStatus(cycle('manual'), new Date('2026-06-15T12:00:00Z')),
    ).toBe('current')
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

  it('does not apply cycle settings to an ungrouped person', () => {
    const host = cycle()
    host.stagesConfig.goals.extensions = [
      {
        id: 'ext-1',
        endDate: '2026-07-15',
        scope: { type: 'people', employeeIds: [202] },
      },
    ]
    const mapped = reviewCycleToGoalsCycle(
      host,
      'window_open',
      new Date('2026-06-15T12:00:00Z'),
      202,
    )
    expect(mapped.assignedGroupId).toBeNull()
    expect(mapped.phase).toBe('not_open')
  })

  it('maps a grouped person to that group window and policy without cycle extensions', () => {
    const host = cycle()
    host.stagesConfig.goals.extensions = [
      {
        id: 'ext-1',
        endDate: '2026-07-15',
        scope: { type: 'people', employeeIds: [101] },
      },
    ]
    const groupWindow = { startDate: '2026-06-01', endDate: '2026-08-01' }
    host.groups = [
      {
        id: 'group-leadership',
        cycleId: host.id,
        name: 'Leadership',
        memberIds: [101],
        settings: {
          ...host.settings,
          postWindowGoalPolicy: 'hard_stop',
          goalCountPolicy: {
            ...host.settings.goalCountPolicy,
            minimumRequired: 4,
          },
        },
        stagesConfig: {
          ...host.stagesConfig,
          goals: { employee: groupWindow, extensions: [] },
        },
        calibration: host.calibration,
        createdAt: host.createdAt,
      },
    ]

    const mapped = reviewCycleToGoalsCycle(
      host,
      'window_open',
      new Date('2026-07-15T12:00:00Z'),
      101,
    )
    expect(mapped.goalWindow).toEqual(groupWindow)
    expect(mapped.goalExtensions).toEqual([])
    expect(mapped.postWindowGoalPolicy).toBe('hard_stop')
    expect(mapped.goalCountPolicy.minimumRequired).toBe(4)
    expect(mapped.phase).toBe('window_open')

    const ungrouped = reviewCycleToGoalsCycle(
      host,
      'window_open',
      new Date('2026-07-15T12:00:00Z'),
      202,
    )
    expect(ungrouped.assignedGroupId).toBeNull()
    expect(ungrouped.phase).toBe('not_open')
  })

  it('applies group deadline extensions to grouped people', () => {
    const host = cycle()
    const groupWindow = { startDate: '2026-06-01', endDate: '2026-07-01' }
    const groupExtension = {
      id: 'ext-product',
      endDate: '2026-08-15',
      scope: {
        type: 'department' as const,
        departmentId: 4,
        departmentName: 'Product',
      },
    }
    host.groups = [
      {
        id: 'group-everyone',
        cycleId: host.id,
        name: 'Everyone',
        memberIds: [101],
        settings: host.settings,
        stagesConfig: {
          ...host.stagesConfig,
          goals: { employee: groupWindow, extensions: [groupExtension] },
        },
        calibration: host.calibration,
        createdAt: host.createdAt,
      },
    ]

    const mapped = reviewCycleToGoalsCycle(
      host,
      'window_open',
      new Date('2026-07-15T12:00:00Z'),
      101,
    )
    expect(mapped.goalExtensions).toEqual([groupExtension])
  })

  it('does not treat an ungrouped person as part of the cycle policy', () => {
    const host = cycle()
    const today = new Date('2026-06-15T12:00:00Z')
    const mapped = reviewCycleToGoalsCycle(host, 'window_open', today, 101)
    expect(mapped.assignedGroupId).toBeNull()
    expect(mapped.phase).toBe('not_open')
    expect(mapped).not.toEqual(
      reviewCycleToGoalsCycle(host, 'window_open', today),
    )
  })
})

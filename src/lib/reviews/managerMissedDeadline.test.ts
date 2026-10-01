import { describe, expect, it } from 'vitest'
import {
  managerMissedDeadlineNotice,
  managerReviewDeadlinePassed,
  packetNeedsManagerForceMove,
} from './managerMissedDeadline'
import type { ReviewCycle } from './types'

function cycleWithManagerEnd(date: string): Pick<ReviewCycle, 'stagesConfig'> {
  return {
    stagesConfig: {
      goals: {
        employee: { start: { date: '2026-01-01' }, end: { date: '2026-01-15' } },
      },
      performance: {
        employeeStart: { date: '2026-01-16' },
        managerStart: { date: '2026-01-16' },
        managerEnd: { date },
      },
      reviewStages: [
        {
          id: 'manager_review',
          enabled: true,
          start: { date: '2026-01-16' },
          end: { date },
        },
      ],
    } as ReviewCycle['stagesConfig'],
  }
}

describe('manager missed deadline', () => {
  it('detects when the manager review window has closed', () => {
    const cycle = cycleWithManagerEnd('2026-01-28')
    expect(
      managerReviewDeadlinePassed(cycle, new Date('2026-01-28T12:00:00')),
    ).toBe(false)
    expect(
      managerReviewDeadlinePassed(cycle, new Date('2026-01-29T00:00:01')),
    ).toBe(true)
  })

  it('needs a force-move only before manager submission', () => {
    const cycle = cycleWithManagerEnd('2026-01-28')
    const today = new Date('2026-02-01')
    expect(
      packetNeedsManagerForceMove(
        { status: 'manager_in_progress', managerMissedDeadline: false },
        cycle,
        today,
      ),
    ).toBe(true)
    expect(
      packetNeedsManagerForceMove(
        { status: 'manager_submitted', managerMissedDeadline: false },
        cycle,
        today,
      ),
    ).toBe(false)
    expect(
      packetNeedsManagerForceMove(
        {
          status: 'manager_in_progress',
          managerMissedDeadline: true,
        },
        cycle,
        today,
      ),
    ).toBe(false)
  })

  it('explains the HOD path when the manager missed', () => {
    expect(managerMissedDeadlineNotice({ managerMissedDeadline: false })).toBeNull()
    expect(
      managerMissedDeadlineNotice({
        managerMissedDeadline: true,
        managerOverallGrade: null,
      }),
    ).toEqual({
      title: 'Manager Missed Deadline',
      message:
        'The line manager did not submit by the deadline. This packet moved to calibration without a manager rating. The HOD can assign the final rating.',
    })
  })
})

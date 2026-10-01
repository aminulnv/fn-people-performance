import { describe, expect, it } from 'vitest'
import {
  describeReviewEditLock,
  describeReviewEditWindowLock,
} from './editWindow'
import type { ReviewStageConfig } from './types'

function localNoon(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12)
}

const stages: ReviewStageConfig[] = [
  {
    id: 'self_review',
    enabled: true,
    start: { date: '2026-06-01', time: '00:00' },
    end: { date: '2026-06-15', time: '00:00' },
  },
  {
    id: 'manager_review',
    enabled: true,
    start: { date: '2026-06-16', time: '00:00' },
    end: { date: '2026-06-30', time: '00:00' },
  },
]

describe('describeReviewEditWindowLock', () => {
  it('locks when the cycle end date has passed', () => {
    expect(
      describeReviewEditWindowLock({
        cycle: {
          name: 'Q2 2026',
          startDate: '2026-04-01',
          endDate: '2026-06-30',
        },
        stages,
        formStage: 'manager_review',
        today: localNoon(2026, 7, 1),
      }),
    ).toEqual({
      title: 'Read Only',
      message: 'This cycle ended on 30 Jun 2026. Reviews are read-only.',
    })
  })

  it('locks when the manager review window has closed', () => {
    expect(
      describeReviewEditWindowLock({
        cycle: {
          name: 'Q2 2026',
          startDate: '2026-04-01',
          endDate: '2026-08-31',
        },
        stages,
        formStage: 'manager_review',
        today: localNoon(2026, 7, 1),
      }),
    ).toEqual({
      title: 'Read Only',
      message:
        'The Manager Review window closed on 30 Jun 2026. This form is read-only.',
    })
  })

  it('stays open while the stage window is still active', () => {
    expect(
      describeReviewEditWindowLock({
        cycle: {
          name: 'Q2 2026',
          startDate: '2026-04-01',
          endDate: '2026-08-31',
        },
        stages,
        formStage: 'manager_review',
        today: localNoon(2026, 6, 30),
      }),
    ).toBeNull()
  })

  it('ignores non-form stages', () => {
    expect(
      describeReviewEditWindowLock({
        cycle: {
          name: 'Q2 2026',
          startDate: '2026-04-01',
          endDate: '2026-08-31',
        },
        stages,
        formStage: 'publish_employees',
        today: localNoon(2026, 7, 1),
      }),
    ).toBeNull()
  })
})

const openCycle = {
  name: 'Annual 2026',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
}

describe('describeReviewEditLock', () => {
  it('prefers the window lock when the cycle has ended', () => {
    expect(
      describeReviewEditLock({
        cycle: {
          name: 'Q2 2026',
          startDate: '2026-04-01',
          endDate: '2026-06-30',
        },
        stages,
        formStage: 'self_review',
        packet: { status: 'self_in_progress', selfSubmittedAt: null },
        isSubject: true,
        today: localNoon(2026, 7, 1),
      }),
    ).toEqual({
      title: 'Read Only',
      message: 'This cycle ended on 30 Jun 2026. Reviews are read-only.',
    })
  })

  it('locks the self-review after it is submitted', () => {
    expect(
      describeReviewEditLock({
        cycle: openCycle,
        stages,
        formStage: 'self_review',
        packet: {
          status: 'manager_submitted',
          selfSubmittedAt: '2026-06-10T00:00:00.000Z',
        },
        isSubject: true,
        today: localNoon(2026, 6, 10),
      }),
    ).toEqual({
      title: 'Read Only',
      message:
        'You already submitted this self-review. This form is read-only.',
    })
  })

  it('locks the self-review for anyone who is not the employee', () => {
    expect(
      describeReviewEditLock({
        cycle: openCycle,
        stages,
        formStage: 'self_review',
        packet: { status: 'self_in_progress', selfSubmittedAt: null },
        isSubject: false,
        isManager: true,
        today: localNoon(2026, 6, 10),
      }),
    ).toEqual({
      title: 'Read Only',
      message: 'Only the employee can edit this self-review.',
    })
  })

  it('locks the manager review when the manager missed the deadline', () => {
    expect(
      describeReviewEditLock({
        cycle: openCycle,
        stages,
        formStage: 'manager_review',
        packet: {
          status: 'in_calibration',
          selfSubmittedAt: '2026-06-10T00:00:00.000Z',
          managerMissedDeadline: true,
          managerOverallGrade: null,
        },
        isManager: true,
        today: localNoon(2026, 6, 20),
      }),
    ).toEqual({
      title: 'Manager Missed Deadline',
      message:
        'The line manager did not submit by the deadline. This packet moved to calibration without a manager rating. The HOD can assign the final rating.',
    })
  })

  it('locks the manager review after grades are released', () => {
    expect(
      describeReviewEditLock({
        cycle: openCycle,
        stages,
        formStage: 'manager_review',
        packet: {
          status: 'released_to_employees',
          selfSubmittedAt: '2026-06-10T00:00:00.000Z',
        },
        isManager: true,
        today: localNoon(2026, 6, 20),
      }),
    ).toEqual({
      title: 'Read Only',
      message: 'Grades have been released. This form is read-only.',
    })
  })

  it('locks the manager review for anyone who is not the line manager', () => {
    expect(
      describeReviewEditLock({
        cycle: openCycle,
        stages,
        formStage: 'manager_review',
        packet: { status: 'manager_in_progress', selfSubmittedAt: null },
        isSubject: true,
        isManager: false,
        today: localNoon(2026, 6, 20),
      }),
    ).toEqual({
      title: 'Read Only',
      message: 'Only the line manager can edit this review.',
    })
  })

  it('stays open when the subject can still edit the self-review', () => {
    expect(
      describeReviewEditLock({
        cycle: openCycle,
        stages,
        formStage: 'self_review',
        packet: { status: 'self_in_progress', selfSubmittedAt: null },
        isSubject: true,
        today: localNoon(2026, 6, 10),
      }),
    ).toBeNull()
  })
})

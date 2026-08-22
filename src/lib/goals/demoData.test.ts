import { describe, expect, it } from 'vitest'
import { DEFAULT_CYCLE_SETTINGS } from '@/lib/reviews/demoData'
import {
  cycleEligibility,
  cycleIneligibilityReason,
  isEligibleForCycle,
} from './demoData'
import type { DemoPerson, GoalsCycle } from './types'

function person(joinDate: string): DemoPerson {
  return {
    id: '101',
    name: 'Aminul Islam Borhan',
    email: 'aminul@example.com',
    title: 'Sr. Executive',
    department: 'People & Culture',
    joinDate,
    reportIds: [],
    avatarHue: 1,
    blurb: '',
  }
}

function cycle(assignedGroupId?: string | null): GoalsCycle {
  return {
    id: 'q3-2026',
    label: 'Q3 2026',
    day1: '2026-07-01',
    phase: 'window_open',
    goalCountPolicy: { ...DEFAULT_CYCLE_SETTINGS.goalCountPolicy },
    postWindowGoalPolicy: DEFAULT_CYCLE_SETTINGS.postWindowGoalPolicy,
    assignedGroupId,
  }
}

describe('cycleEligibility', () => {
  it('treats a grouped person who joined on or before Day 1 as eligible', () => {
    const subject = person('2025-04-07')
    expect(cycleEligibility(subject, cycle('everyone'))).toBeNull()
    expect(isEligibleForCycle(subject, cycle('everyone'))).toBe(true)
  })

  it('does not blame join date when the person is outside every group', () => {
    const subject = person('2025-04-07')
    expect(cycleEligibility(subject, cycle(null))).toBe('not_in_cycle')
    expect(isEligibleForCycle(subject, cycle(null))).toBe(false)
  })

  it('marks a grouped late joiner as ineligible for this quarter', () => {
    const subject = person('2026-07-02')
    expect(cycleEligibility(subject, cycle('everyone'))).toBe(
      'joined_after_day1',
    )
    expect(isEligibleForCycle(subject, cycle('everyone'))).toBe(false)
  })

  it('keeps a stored not_eligible row as a late-join only when they are in the cycle', () => {
    expect(
      cycleIneligibilityReason(
        person('2025-04-07'),
        cycle('everyone'),
        'not_eligible',
      ),
    ).toBe('joined_after_day1')
    expect(
      cycleIneligibilityReason(person('2025-04-07'), cycle(null), 'approved'),
    ).toBe('not_in_cycle')
  })
})

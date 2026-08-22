import { describe, expect, it } from 'vitest'
import {
  cycleIneligibilityEmptyState,
  cycleIneligibilityStatusLabel,
  statusLabel,
  submissionStatusLabel,
} from './statusLabels'

describe('submissionStatusLabel', () => {
  it('reads Not started when the person has no goals yet', () => {
    expect(submissionStatusLabel('draft', 0)).toBe('Not started')
  })

  it('reads Draft once a goal exists', () => {
    expect(submissionStatusLabel('draft', 1)).toBe('Draft')
  })

  it('keeps every other status untouched when there are no goals', () => {
    expect(submissionStatusLabel('not_eligible', 0)).toBe(
      statusLabel('not_eligible'),
    )
  })
})

describe('cycleIneligibilityEmptyState', () => {
  it('explains a missing review group instead of a late join', () => {
    expect(
      cycleIneligibilityEmptyState('Aminul Islam Borhan', 'not_in_cycle'),
    ).toEqual({
      title: 'Not in this cycle',
      description:
        'Aminul Islam Borhan is not assigned to a review group for this cycle.',
    })
    expect(cycleIneligibilityStatusLabel('not_in_cycle')).toBe(
      'Not in this cycle',
    )
  })

  it('keeps the Day 1 copy for a late joiner', () => {
    expect(
      cycleIneligibilityEmptyState('Aminul Islam Borhan', 'joined_after_day1'),
    ).toEqual({
      title: 'Not eligible this quarter',
      description:
        'Aminul Islam Borhan joined after Day 1, so goal setting starts next quarter.',
    })
  })
})

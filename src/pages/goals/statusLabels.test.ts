import { describe, expect, it } from 'vitest'
import {
  cycleIneligibilityEmptyState,
  cycleIneligibilityStatusLabel,
  ownGoalsEmptyCopy,
  reportGoalsEmptyDescription,
  statusLabel,
  statusVariant,
  submissionStatusLabel,
} from './statusLabels'

describe('statusVariant', () => {
  it('gives draft its own tone so it does not read as muted chrome', () => {
    expect(statusVariant('draft')).toBe('draft')
    expect(statusVariant('submitted')).toBe('pending')
    expect(statusVariant('sent_back')).toBe('pending')
    expect(statusVariant('approved')).toBe('completed')
  })
})

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
  it('explains a missing group instead of a late join', () => {
    expect(
      cycleIneligibilityEmptyState('Aminul Islam Borhan', 'not_in_cycle'),
    ).toEqual({
      title: 'Not in this cycle',
      description:
        'Aminul Islam Borhan is not assigned to a group for this cycle.',
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

describe('ownGoalsEmptyCopy', () => {
  it('invites a first goal without dumping weight rules', () => {
    expect(ownGoalsEmptyCopy(true)).toEqual({
      title: 'No goals yet',
      description: 'Add your first goal for this cycle.',
    })
  })

  it('uses the lock message when goals cannot be added', () => {
    expect(ownGoalsEmptyCopy(false, 'The window is closed.')).toEqual({
      title: 'No goals yet',
      description: 'The window is closed.',
    })
  })
})

describe('reportGoalsEmptyDescription', () => {
  it('names the person and offers to start when the reviewer can add', () => {
    expect(reportGoalsEmptyDescription('Saif Ivna Alam', true)).toBe(
      'Add one for Saif, or wait for them to start.',
    )
  })
})

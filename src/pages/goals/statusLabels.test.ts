import { describe, expect, it } from 'vitest'
import { statusLabel, submissionStatusLabel } from './statusLabels'

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

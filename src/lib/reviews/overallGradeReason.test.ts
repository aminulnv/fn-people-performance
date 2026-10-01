import { describe, expect, it } from 'vitest'
import {
  overallGradeReasonIsComplete,
  overallGradeReasonNeed,
} from './overallGradeReason'

describe('overallGradeReasonNeed', () => {
  it('does not ask the employee for a reason', () => {
    expect(
      overallGradeReasonNeed({
        actorRole: 'self',
        overallGrade: 'exceeding',
        suggestedGrade: 'performing',
        gapCommentTiers: 2,
      }),
    ).toBeNull()
  })

  it('does not ask when the manager matches the formula', () => {
    expect(
      overallGradeReasonNeed({
        actorRole: 'manager',
        overallGrade: 'performing',
        suggestedGrade: 'performing',
        selfOverallGrade: 'performing',
        gapCommentTiers: 2,
      }),
    ).toBeNull()
  })

  it('requires a reason when the manager differs from the formula', () => {
    const need = overallGradeReasonNeed({
      actorRole: 'manager',
      overallGrade: 'exceeding',
      suggestedGrade: 'performing',
    })
    expect(need?.required).toBe(true)
    expect(need?.hint).toMatch(/calculated Performing/)
  })

  it('requires a reason when the self-review gap is at least two bands', () => {
    const need = overallGradeReasonNeed({
      actorRole: 'manager',
      overallGrade: 'exceeding',
      selfOverallGrade: 'developing',
      gapCommentTiers: 2,
    })
    expect(need?.required).toBe(true)
    expect(need?.hint).toMatch(/self-review/)
  })

  it('does not require a one-band self-review gap', () => {
    expect(
      overallGradeReasonNeed({
        actorRole: 'manager',
        overallGrade: 'performing',
        selfOverallGrade: 'exceeding',
        gapCommentTiers: 2,
      }),
    ).toBeNull()
  })

  it('treats a blank reason as incomplete', () => {
    expect(
      overallGradeReasonIsComplete(
        { required: true, title: 'Why this overall grade?', hint: 'Explain.' },
        '   ',
      ),
    ).toBe(false)
  })
})

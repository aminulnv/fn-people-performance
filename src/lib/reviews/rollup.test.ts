import { describe, expect, it } from 'vitest'
import { defaultReviewPolicy, reweightEnabledPillars } from './reviewPolicy'
import { combinePillarScores, rollupGoalsPillar } from './rollup'

describe('rollupGoalsPillar', () => {
  it('averages applicable quarters with equal weight', () => {
    const result = rollupGoalsPillar({
      links: [
        { sourceCycleId: 'q1', weightPercent: 25, excluded: false, transitionGrade: 'performing' },
        { sourceCycleId: 'q2', weightPercent: 25, excluded: false },
        { sourceCycleId: 'q3', weightPercent: 25, excluded: false },
        { sourceCycleId: 'q4', weightPercent: 25, excluded: false },
      ],
      quarters: [
        { sourceCycleId: 'q1', label: 'Q1', outcome: { kind: 'grade', grade: 'exceptional' } },
        { sourceCycleId: 'q2', label: 'Q2', outcome: { kind: 'grade', grade: 'exceeding' } },
        { sourceCycleId: 'q3', label: 'Q3', outcome: { kind: 'zero' } },
        { sourceCycleId: 'q4', label: 'Q4', outcome: { kind: 'grade', grade: 'exceeding' } },
      ],
    })

    expect(result.applicable.map((row) => row.grade)).toEqual([
      'performing',
      'exceeding',
      'unsatisfactory',
      'exceeding',
    ])
    expect(result.averageGrade).toBe('performing')
  })

  it('excludes leave and inapplicable quarters', () => {
    const result = rollupGoalsPillar({
      links: [
        { sourceCycleId: 'q1', weightPercent: 25, excluded: false },
        { sourceCycleId: 'q2', weightPercent: 25, excluded: false },
        { sourceCycleId: 'q3', weightPercent: 25, excluded: false },
      ],
      quarters: [
        { sourceCycleId: 'q1', label: 'Q1', outcome: { kind: 'inapplicable' } },
        { sourceCycleId: 'q2', label: 'Q2', outcome: { kind: 'leave' } },
        { sourceCycleId: 'q3', label: 'Q3', outcome: { kind: 'grade', grade: 'exceeding' } },
      ],
    })

    expect(result.applicable).toHaveLength(1)
    expect(result.averageGrade).toBe('exceeding')
  })
})

describe('combinePillarScores', () => {
  it('uses 50/25/25 when all pillars are on', () => {
    const result = combinePillarScores({
      policy: defaultReviewPolicy('annual_appraisal'),
      pillarGrades: {
        goals: 'exceeding',
        skills: 'performing',
        values: 'performing',
      },
    })
    expect(result.suggestedGrade).toBe('exceeding')
  })

  it('reweights when a pillar is turned off', () => {
    const policy = defaultReviewPolicy('annual_appraisal')
    policy.scorecard.pillars = policy.scorecard.pillars.map((pillar) =>
      pillar.id === 'skills' ? { ...pillar, enabled: false } : pillar,
    )
    const adjusted = reweightEnabledPillars(policy)
    expect(adjusted.scorecard.pillars.filter((pillar) => pillar.enabled).map((p) => p.weight)).toEqual([
      50, 50,
    ])
  })
})

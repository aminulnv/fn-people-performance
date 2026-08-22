import { describe, expect, it } from 'vitest'
import { defaultReviewPolicy, pillarWeightTotal } from './reviewPolicy'
import {
  addCustomPillar,
  addReviewQuestion,
  applyScorecardTemplate,
  mergePillarCatalog,
  SCORECARD_TEMPLATES,
  moveReviewQuestion,
  removeReviewQuestion,
  toggleQuestionVisibility,
} from './scorecardTemplates'

describe('scorecard templates', () => {
  it('lists Create form before the library presets', () => {
    expect(SCORECARD_TEMPLATES[0]?.id).toBe('blank')
    expect(SCORECARD_TEMPLATES[0]?.name).toBe('Create form')
  })

  it('gives annual the 50/25/25 mix and year-end questions', () => {
    const policy = defaultReviewPolicy('annual_appraisal')
    const enabled = policy.scorecard.pillars.filter((pillar) => pillar.enabled)
    expect(enabled.map((pillar) => [pillar.kind, pillar.weight])).toEqual([
      ['goals', 50],
      ['skills', 25],
      ['values', 25],
    ])
    expect(pillarWeightTotal(policy)).toBe(100)
    expect(policy.scorecard.questions.map((question) => question.id)).toContain(
      'retain',
    )
    expect(
      policy.scorecard.questions.find((question) => question.id === 'retain')
        ?.visibility,
    ).toEqual(['calibrators'])
  })

  it('gives quarterly a goals-only form', () => {
    const policy = defaultReviewPolicy('quarterly_checkin')
    expect(
      policy.scorecard.pillars
        .filter((pillar) => pillar.enabled)
        .map((pillar) => pillar.kind),
    ).toEqual(['goals'])
    expect(pillarWeightTotal(policy)).toBe(100)
    expect(policy.scorecard.questions[0]?.visibility).toEqual([
      'manager',
      'calibrators',
    ])
  })

  it('applies a library template without losing bands', () => {
    const policy = applyScorecardTemplate(
      defaultReviewPolicy('quarterly_checkin'),
      'leadership',
    )
    expect(
      policy.scorecard.pillars
        .filter((pillar) => pillar.enabled)
        .map((pillar) => [pillar.kind, pillar.weight]),
    ).toEqual([
      ['goals', 50],
      ['leadership', 50],
    ])
    expect(policy.scorecard.bands).toHaveLength(5)
  })

  it('adds leadership to older scorecards that omitted it', () => {
    const merged = mergePillarCatalog([
      {
        id: 'goals',
        kind: 'goals',
        label: 'Goals',
        enabled: true,
        weight: 100,
        pullLinkedQuarters: true,
      },
    ])
    expect(merged.map((pillar) => pillar.kind)).toEqual([
      'goals',
      'skills',
      'values',
      'leadership',
    ])
    expect(merged.find((pillar) => pillar.kind === 'leadership')?.enabled).toBe(
      false,
    )
  })
})

describe('review form edits', () => {
  it('adds, moves, and removes questions', () => {
    let policy = defaultReviewPolicy('custom')
    expect(policy.scorecard.questions).toHaveLength(0)
    policy = addReviewQuestion(policy)
    policy = addReviewQuestion(policy)
    policy.scorecard.questions[0]!.prompt = 'First'
    policy.scorecard.questions[1]!.prompt = 'Second'
    const firstId = policy.scorecard.questions[0]!.id
    policy = moveReviewQuestion(policy, firstId, 1)
    expect(policy.scorecard.questions.map((question) => question.prompt)).toEqual(
      ['Second', 'First'],
    )
    policy = removeReviewQuestion(policy, firstId)
    expect(policy.scorecard.questions).toHaveLength(1)
  })

  it('keeps at least one visibility audience', () => {
    const policy = defaultReviewPolicy('annual_appraisal')
    const next = toggleQuestionVisibility(policy, 'delivered', 'employee', false)
    expect(
      next.scorecard.questions.find((question) => question.id === 'delivered')
        ?.visibility,
    ).toEqual(['manager', 'calibrators'])
    const blocked = toggleQuestionVisibility(next, 'delivered', 'manager', false)
    const still = toggleQuestionVisibility(blocked, 'delivered', 'calibrators', false)
    expect(
      still.scorecard.questions.find((question) => question.id === 'delivered')
        ?.visibility,
    ).toEqual(['calibrators'])
  })

  it('adds a custom grading area', () => {
    const policy = addCustomPillar(defaultReviewPolicy('custom'), 'Client impact')
    expect(
      policy.scorecard.pillars.some(
        (pillar) => pillar.kind === 'custom' && pillar.label === 'Client impact',
      ),
    ).toBe(true)
  })
})

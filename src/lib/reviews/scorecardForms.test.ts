import { describe, expect, it } from 'vitest'
import { resolveCyclePolicyForPerson } from './cycleGroups'
import { normalizeCycleSettings } from './demoData'
import { defaultReviewPolicy } from './reviewPolicy'
import {
  countScorecardFormUsage,
  resolveReviewPolicyFromSettings,
  scorecardFormPolicyEquals,
  seedScorecardForms,
  suggestedScorecardFormId,
} from './scorecardForms'
import type { ReviewCycle, ScorecardForm } from './types'

function cycleWithGroup(
  scorecardFormId: string | null,
  reviewPolicy = defaultReviewPolicy('annual_appraisal'),
): ReviewCycle {
  return {
    id: 'cycle-1',
    name: 'Test',
    type: 'regular',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    periodKey: '2026',
    isTest: false,
    stagesConfig: {
      goals: {
        employee: { startDate: '2026-01-01', endDate: '2026-01-31' },
        extensions: [],
      },
      performance: {
        employeeStart: { date: '2026-02-01', time: '00:00' },
        managerEnd: { date: '2026-02-28', time: '00:00' },
      },
      reviewStages: [],
    },
    settings: normalizeCycleSettings({ reviewPolicy }),
    calibration: {
      gradeDistribution: {
        exceptional: 10,
        exceeding: 20,
        performing: 40,
        developing: 20,
        unsatisfactory: 10,
      },
    },
    groups: [
      {
        id: 'group-1',
        cycleId: 'cycle-1',
        name: 'Group 1',
        memberIds: [101],
        settings: normalizeCycleSettings({
          reviewPolicy,
          scorecardFormId,
        }),
        stagesConfig: {
          goals: {
            employee: { startDate: '2026-01-01', endDate: '2026-01-31' },
            extensions: [],
          },
          performance: {
            employeeStart: { date: '2026-02-01', time: '00:00' },
            managerEnd: { date: '2026-02-28', time: '00:00' },
          },
          reviewStages: [],
        },
        calibration: {
          gradeDistribution: {
            exceptional: 10,
            exceeding: 20,
            performing: 40,
            developing: 20,
            unsatisfactory: 10,
          },
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        version: 1,
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    version: 1,
  }
}

describe('resolveReviewPolicyFromSettings', () => {
  it('uses the live-linked form when scorecardFormId is set', () => {
    const forms = seedScorecardForms()
    const form = forms[0]!
    form.policy.scorecard.questions[0]!.prompt = 'From template'
    const settings = normalizeCycleSettings({
      scorecardFormId: form.id,
      reviewPolicy: defaultReviewPolicy('quarterly_checkin'),
    })
    const resolved = resolveReviewPolicyFromSettings(
      settings,
      forms,
      'annual_appraisal',
    )
    expect(resolved.scorecard.questions[0]?.prompt).toBe('From template')
  })

  it('falls back to embedded reviewPolicy when no form is allocated', () => {
    const settings = normalizeCycleSettings({
      scorecardFormId: null,
      reviewPolicy: defaultReviewPolicy('annual_appraisal'),
    })
    const resolved = resolveReviewPolicyFromSettings(settings, [], 'annual_appraisal')
    expect(resolved.scorecard.questions.length).toBeGreaterThan(0)
  })
})

describe('resolveCyclePolicyForPerson with forms', () => {
  it('overlays the allocated form onto the group policy', () => {
    const forms = seedScorecardForms()
    const form = forms.find((item) => item.id === 'form-q1-checkin')!
    form.policy.scorecard.questions = [
      {
        id: 'q-live',
        prompt: 'Live linked question',
        enabled: true,
        required: false,
        kind: 'open_ended',
        visibility: ['manager'],
        outputVisibility: ['manager'],
      },
    ]
    const cycle = cycleWithGroup(form.id)
    const resolved = resolveCyclePolicyForPerson(cycle, 101, forms)
    expect(resolved.settings.reviewPolicy?.scorecard.questions[0]?.prompt).toBe(
      'Live linked question',
    )
  })

  it('keeps legacy embedded policy when form id is missing', () => {
    const cycle = cycleWithGroup(null, defaultReviewPolicy('annual_appraisal'))
    const resolved = resolveCyclePolicyForPerson(cycle, 101, [])
    expect(
      resolved.settings.reviewPolicy?.scorecard.questions.length,
    ).toBeGreaterThan(0)
  })
})

describe('countScorecardFormUsage', () => {
  it('counts groups that allocate the form', () => {
    const forms: ScorecardForm[] = seedScorecardForms()
    const formId = forms[0]!.id
    const cycles = [cycleWithGroup(formId), cycleWithGroup(null)]
    expect(countScorecardFormUsage(formId, cycles)).toBe(1)
  })
})

describe('seedScorecardForms', () => {
  it('seeds Q1–Q4 and Annual with the right grading toggles', () => {
    const forms = seedScorecardForms()
    const byId = Object.fromEntries(forms.map((form) => [form.id, form]))

    expect(byId['form-q1-checkin']?.policy.managerReview).toMatchObject({
      gradeGoals: true,
      gradeOverall: false,
    })
    expect(byId['form-q2-checkin']?.policy.managerReview).toMatchObject({
      gradeGoals: true,
      gradeOverall: false,
    })
    expect(byId['form-q3-checkin']?.policy.managerReview).toMatchObject({
      gradeGoals: true,
      gradeOverall: false,
    })
    expect(byId['form-q4-progress']?.policy.managerReview).toMatchObject({
      gradeGoals: false,
      gradeOverall: false,
    })
    expect(byId['form-q4-progress']?.policy.scorecard.questions[0]?.id).toBe(
      'q4-progress',
    )
    expect(byId['form-annual-appraisal']?.policy.managerReview).toMatchObject({
      gradeGoals: true,
      gradeOverall: true,
    })
    expect(
      byId['form-annual-appraisal']?.policy.scorecard.pillars
        .filter((pillar) => pillar.enabled)
        .map((pillar) => [pillar.kind, pillar.weight]),
    ).toEqual([
      ['goals', 50],
      ['skills', 25],
      ['values', 25],
    ])
  })
})

describe('suggestedScorecardFormId', () => {
  it('maps each cycle period to the matching built-in form', () => {
    expect(suggestedScorecardFormId('quarterly_checkin', 'q1-2026')).toBe(
      'form-q1-checkin',
    )
    expect(suggestedScorecardFormId('quarterly_checkin', 'q4-2026')).toBe(
      'form-q4-progress',
    )
    expect(suggestedScorecardFormId('annual_appraisal', 'annual-2026')).toBe(
      'form-annual-appraisal',
    )
  })
})

describe('scorecardFormPolicyEquals', () => {
  it('detects policy content changes', () => {
    const forms = seedScorecardForms()
    const base = forms[0]!.policy
    expect(scorecardFormPolicyEquals(base, structuredClone(base))).toBe(true)
    const changed = structuredClone(base)
    changed.scorecard.questions[0]!.prompt = 'Changed'
    expect(scorecardFormPolicyEquals(base, changed)).toBe(false)
  })
})

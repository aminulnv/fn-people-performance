import { describe, expect, it } from 'vitest'
import { buildDefaultStagesConfig } from './demoData'
import {
  applyCycleModules,
  cycleModulesOf,
  isCyclePublishStage,
  describeCycleSetup,
  describeEnabledFlow,
  presetCycleModules,
  presetEnabledStages,
  presetReviewFlowStages,
} from './reviewStages'

describe('cycle module presets', () => {
  it('starts Q1–Q3 with goals and a manager review', () => {
    expect(presetEnabledStages('quarterly_checkin', 'q3-2026')).toEqual([
      'goals',
      'manager_review',
    ])
    expect(presetCycleModules('quarterly_checkin', 'q3-2026')).toEqual({
      goals: true,
      reviews: true,
    })
  })

  it('starts Q4 with goals only', () => {
    expect(presetEnabledStages('quarterly_checkin', 'q4-2026')).toEqual(['goals'])
    expect(presetCycleModules('quarterly_checkin', 'q4-2026')).toEqual({
      goals: true,
      reviews: false,
    })
  })

  it('starts annual as review only', () => {
    expect(presetCycleModules('annual_appraisal', 'annual-2026')).toEqual({
      goals: false,
      reviews: true,
    })
    expect(presetEnabledStages('annual_appraisal', 'annual-2026')).not.toContain(
      'goals',
    )
  })

  it('uses the quarterly review flow when Reviews is turned on for Q4', () => {
    expect(presetReviewFlowStages('quarterly_checkin', 'q4-2026')).toEqual([
      'manager_review',
    ])
  })
})

describe('cycle publish stages', () => {
  it('treats manager and employee release as cycle-wide', () => {
    expect(isCyclePublishStage('publish_managers')).toBe(true)
    expect(isCyclePublishStage('publish_employees')).toBe(true)
    expect(isCyclePublishStage('manager_review')).toBe(false)
  })
})

describe('applyCycleModules', () => {
  it('turns Reviews off on a quarterly cycle without dropping goals', () => {
    const config = buildDefaultStagesConfig(
      '2026-07-01',
      '2026-09-30',
      'quarterly_checkin',
      'q3-2026',
    )
    const next = applyCycleModules(
      config,
      { goals: true, reviews: false },
      'quarterly_checkin',
      'q3-2026',
    )
    expect(cycleModulesOf(next.reviewStages)).toEqual({
      goals: true,
      reviews: false,
    })
    expect(describeCycleSetup(next.reviewStages)).toBe('Goals only.')
  })

  it('turns Reviews on for Q4 as a manager check-in', () => {
    const config = buildDefaultStagesConfig(
      '2026-10-01',
      '2026-12-31',
      'quarterly_checkin',
      'q4-2026',
    )
    expect(cycleModulesOf(config.reviewStages).reviews).toBe(false)

    const next = applyCycleModules(
      config,
      { goals: true, reviews: true },
      'quarterly_checkin',
      'q4-2026',
    )
    expect(cycleModulesOf(next.reviewStages)).toEqual({
      goals: true,
      reviews: true,
    })
    expect(
      next.reviewStages?.find((stage) => stage.id === 'manager_review')?.enabled,
    ).toBe(true)
    expect(
      next.reviewStages?.find((stage) => stage.id === 'self_review')?.enabled,
    ).toBe(false)
  })

  it('keeps existing review stages when Reviews stays on', () => {
    const config = buildDefaultStagesConfig(
      '2029-01-01',
      '2029-02-15',
      'annual_appraisal',
      'annual-2028',
    )
    const withoutAppeal = {
      ...config,
      reviewStages: (config.reviewStages ?? []).map((stage) =>
        stage.id === 'appeal' ? { ...stage, enabled: false } : stage,
      ),
    }
    const next = applyCycleModules(
      withoutAppeal,
      { goals: false, reviews: true },
      'annual_appraisal',
      'annual-2028',
    )
    expect(
      next.reviewStages?.find((stage) => stage.id === 'appeal')?.enabled,
    ).toBe(false)
    expect(describeEnabledFlow(next.reviewStages)).not.toContain('Appeal')
  })
})

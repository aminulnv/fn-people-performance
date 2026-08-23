import {
  applyScorecardTemplate,
  DEFAULT_GRADE_BANDS,
  mergePillarCatalog,
  SCORECARD_PILLAR_CATALOG,
  templateIdForPurpose,
} from './scorecardTemplates'
import type {
  CyclePurpose,
  ReviewPolicy,
  ReviewQuestion,
  ScorecardPillar,
} from './types'

export {
  DEFAULT_ANNUAL_QUESTIONS,
  DEFAULT_GRADE_BANDS,
} from './scorecardTemplates'

export const DEFAULT_ANNUAL_PILLARS: ScorecardPillar[] = SCORECARD_PILLAR_CATALOG.map(
  (pillar) => ({ ...pillar }),
)

export function defaultReviewPolicy(purpose: CyclePurpose = 'quarterly_checkin'): ReviewPolicy {
  const isAnnual = purpose === 'annual_appraisal'
  const base: ReviewPolicy = {
    selfReview: {
      ratePillars: isAnnual,
      rateOverall: isAnnual,
      visibility: 'visible_first',
      latePolicy: 'proceed',
    },
    managerReview: {
      narrative: 'overall',
      gapCommentTiers: isAnnual ? 2 : 0,
      gradeGoals: isAnnual,
      gradeOverall: true,
      goalsScoreEdit: 'read_only',
      finalGradeEdit: 'override_with_reason',
      gradeSuggestion: 'none',
      latePolicy: isAnnual ? 'escalate' : 'extend',
      escalationRoles: ['hod', 'slt', 'ptr'],
    },
    calibration: {
      editors: 'hod_and_hrbp',
      distribution: 'guidance',
    },
    release: {
      mode: isAnnual ? 'window_then_auto' : 'immediate_on_submit',
      acknowledgement: 'first_view',
    },
    appeal: {
      mode: 'record_only',
      days: 7,
    },
    eligibility: {
      excludeNoticePeriod: true,
      excludeProbation: false,
      excludePip: false,
    },
    scorecard: {
      pillars: [],
      questions: [],
      bands: DEFAULT_GRADE_BANDS.map((band) => ({ ...band })),
      extraGradeFields: [],
    },
  }
  return applyScorecardTemplate(base, templateIdForPurpose(purpose))
}

export function normalizeReviewPolicy(
  policy?: Partial<ReviewPolicy> | null,
  purpose: CyclePurpose = 'quarterly_checkin',
): ReviewPolicy {
  const defaults = defaultReviewPolicy(purpose)
  if (!policy) return defaults
  return {
    selfReview: { ...defaults.selfReview, ...policy.selfReview },
    managerReview: {
      ...defaults.managerReview,
      ...policy.managerReview,
      gradeGoals:
        policy.managerReview?.gradeGoals ?? defaults.managerReview.gradeGoals,
      gradeOverall:
        policy.managerReview?.gradeOverall ?? defaults.managerReview.gradeOverall,
      escalationRoles:
        policy.managerReview?.escalationRoles ?? defaults.managerReview.escalationRoles,
    },
    calibration: { ...defaults.calibration, ...policy.calibration },
    release: { ...defaults.release, ...policy.release },
    appeal: { ...defaults.appeal, ...policy.appeal },
    eligibility: { ...defaults.eligibility, ...policy.eligibility },
    scorecard: {
      pillars: mergePillarCatalog(
        policy.scorecard?.pillars?.length
          ? policy.scorecard.pillars
          : defaults.scorecard.pillars,
      ),
      questions:
        policy.scorecard?.questions != null
          ? policy.scorecard.questions
          : defaults.scorecard.questions,
      bands:
        policy.scorecard?.bands?.length
          ? policy.scorecard.bands
          : defaults.scorecard.bands,
      extraGradeFields: policy.scorecard?.extraGradeFields ?? [],
    },
  }
}

export function enabledPillars(policy: ReviewPolicy): ScorecardPillar[] {
  return policy.scorecard.pillars.filter((pillar) => pillar.enabled)
}

export function gradesGoalsSeparately(policy: ReviewPolicy): boolean {
  return Boolean(policy.managerReview.gradeGoals)
}

export function gradesOverall(policy: ReviewPolicy): boolean {
  return Boolean(policy.managerReview.gradeOverall)
}

export function enabledQuestions(
  policy: ReviewPolicy,
  visibility?: ReviewQuestion['visibility'][number],
): ReviewQuestion[] {
  return policy.scorecard.questions.filter((question) => {
    if (!question.enabled) return false
    if (!visibility) return true
    return question.visibility.includes(visibility)
  })
}

export function pillarWeightTotal(policy: ReviewPolicy): number {
  return enabledPillars(policy).reduce((sum, pillar) => sum + pillar.weight, 0)
}

export function reweightEnabledPillars(policy: ReviewPolicy): ReviewPolicy {
  const active = enabledPillars(policy)
  if (active.length === 0) return policy
  const equal = Math.floor(100 / active.length)
  const remainder = 100 - equal * active.length
  const nextWeights = new Map(
    active.map((pillar, index) => [
      pillar.id,
      equal + (index === 0 ? remainder : 0),
    ]),
  )
  return {
    ...policy,
    scorecard: {
      ...policy.scorecard,
      pillars: policy.scorecard.pillars.map((pillar) =>
        pillar.enabled
          ? { ...pillar, weight: nextWeights.get(pillar.id) ?? pillar.weight }
          : pillar,
      ),
    },
  }
}

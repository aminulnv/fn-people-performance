import { isGoalsOnlyQuarter } from './reviewStages'
import {
  applyScorecardTemplate,
  DEFAULT_GRADE_BANDS,
  DEFAULT_SCORECARD_FEEDBACK,
  mergePillarCatalog,
  normalizeReviewQuestion,
  normalizeScorecardFeedback,
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
  DEFAULT_QUARTERLY_QUESTIONS,
  DEFAULT_GRADE_BANDS,
} from './scorecardTemplates'

export const DEFAULT_ANNUAL_PILLARS: ScorecardPillar[] = SCORECARD_PILLAR_CATALOG.map(
  (pillar) => ({ ...pillar }),
)

function stripUnusedManagerFields(
  managerReview: ReviewPolicy['managerReview'] & {
    goalsScoreEdit?: unknown
    finalGradeEdit?: unknown
  },
): ReviewPolicy['managerReview'] {
  const {
    goalsScoreEdit: _goalsScore,
    finalGradeEdit: _finalGrade,
    ...rest
  } = managerReview
  return rest
}

export function defaultReviewPolicy(
  purpose: CyclePurpose = 'quarterly_checkin',
  periodKey?: string,
): ReviewPolicy {
  const isAnnual = purpose === 'annual_appraisal'
  // Q1–Q3: goals on / overall off · Q4: both off · Annual: both on
  const isQ4 =
    purpose === 'quarterly_checkin' && isGoalsOnlyQuarter(periodKey)
  const gradeGoals = isAnnual || !isQ4
  const gradeOverall = isAnnual
  const base: ReviewPolicy = {
    selfReview: {
      ratePillars: isAnnual,
      rateOverall: isAnnual,
    },
    managerReview: {
      narrative: 'overall',
      gapCommentTiers: isAnnual ? 2 : 0,
      gradeGoals,
      gradeOverall,
      gradeSuggestion: isAnnual ? 'weighted_suggest' : 'none',
      latePolicy: isAnnual ? 'escalate' : 'extend',
      escalationRoles: ['hod', 'slt', 'ptr'],
    },
    calibration: {
      editors: 'hod_and_hrbp',
      distribution: 'guidance',
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
      feedback: { ...DEFAULT_SCORECARD_FEEDBACK },
    },
  }
  return applyScorecardTemplate(base, templateIdForPurpose(purpose, periodKey))
}

export type LockedGradeToggles = {
  locked: boolean
  gradeGoals: boolean
  gradeOverall: boolean
}

/**
 * Regular quarterly + annual cycles lock Goals/Overall to the appraisal model.
 * Custom cycles stay editable.
 */
export function lockedGradeTogglesForCycle(
  purpose: CyclePurpose,
  periodKey?: string,
): LockedGradeToggles {
  if (purpose === 'annual_appraisal') {
    return {
      locked: true,
      gradeGoals: true,
      gradeOverall: true,
    }
  }
  if (purpose === 'quarterly_checkin') {
    if (isGoalsOnlyQuarter(periodKey)) {
      return {
        locked: true,
        gradeGoals: false,
        gradeOverall: false,
      }
    }
    return {
      locked: true,
      gradeGoals: true,
      gradeOverall: false,
    }
  }
  return {
    locked: false,
    gradeGoals: false,
    gradeOverall: false,
  }
}

export function normalizeReviewPolicy(
  policy?: Partial<ReviewPolicy> | null,
  purpose: CyclePurpose = 'quarterly_checkin',
  periodKey?: string,
): ReviewPolicy {
  const defaults = defaultReviewPolicy(purpose, periodKey)
  const gradeLocks = lockedGradeTogglesForCycle(purpose, periodKey)
  if (!policy) return defaults
  return {
    selfReview: {
      ratePillars:
        policy.selfReview?.ratePillars ?? defaults.selfReview.ratePillars,
      rateOverall:
        policy.selfReview?.rateOverall ?? defaults.selfReview.rateOverall,
    },
    managerReview: stripUnusedManagerFields({
      ...defaults.managerReview,
      ...policy.managerReview,
      gradeGoals: gradeLocks.locked
        ? gradeLocks.gradeGoals
        : (policy.managerReview?.gradeGoals ?? defaults.managerReview.gradeGoals),
      gradeOverall: gradeLocks.locked
        ? gradeLocks.gradeOverall
        : (policy.managerReview?.gradeOverall ??
          defaults.managerReview.gradeOverall),
      escalationRoles:
        policy.managerReview?.escalationRoles ??
        defaults.managerReview.escalationRoles,
    }),
    calibration: { ...defaults.calibration, ...policy.calibration },
    eligibility: { ...defaults.eligibility, ...policy.eligibility },
    scorecard: {
      pillars: mergePillarCatalog(
        policy.scorecard?.pillars?.length
          ? policy.scorecard.pillars
          : defaults.scorecard.pillars,
      ),
      questions:
        Array.isArray(policy.scorecard?.questions) &&
        (policy.scorecard.questions.length > 0 || purpose === 'custom')
          ? policy.scorecard.questions.map((question) =>
              normalizeReviewQuestion({
                ...question,
                id: question.id,
                prompt: question.prompt ?? '',
              }),
            )
          : defaults.scorecard.questions,
      bands:
        policy.scorecard?.bands?.length
          ? policy.scorecard.bands
          : defaults.scorecard.bands,
      extraGradeFields: policy.scorecard?.extraGradeFields ?? [],
      feedback: normalizeScorecardFeedback(policy.scorecard?.feedback),
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

export function scorecardFeedbackOf(policy: ReviewPolicy) {
  return normalizeScorecardFeedback(policy.scorecard.feedback)
}

export function feedbackEnabledForVisibility(
  policy: ReviewPolicy,
  visibility?: ReviewQuestion['visibility'][number],
): boolean {
  const feedback = scorecardFeedbackOf(policy)
  if (!feedback.enabled) return false
  if (!visibility) return true
  return feedback.visibility.includes(visibility)
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

export function enabledOutputQuestions(
  policy: ReviewPolicy,
  audience: ReviewQuestion['outputVisibility'][number],
): ReviewQuestion[] {
  return policy.scorecard.questions.filter(
    (question) =>
      question.enabled &&
      (question.outputVisibility ?? ['employee', 'manager']).includes(audience),
  )
}

export function pillarWeightTotal(policy: ReviewPolicy): number {
  return enabledPillars(policy).reduce((sum, pillar) => sum + pillar.weight, 0)
}

/** Room left for this pillar so enabled weights never exceed 100. */
export function remainingPillarWeight(
  policy: ReviewPolicy,
  pillarId: string,
): number {
  const usedByOthers = enabledPillars(policy).reduce((sum, pillar) => {
    if (pillar.id === pillarId) return sum
    return sum + pillar.weight
  }, 0)
  return Math.max(0, 100 - usedByOthers)
}

export function clampPillarWeight(
  policy: ReviewPolicy,
  pillarId: string,
  weight: number,
): number {
  const ceiling = remainingPillarWeight(policy, pillarId)
  return Math.min(ceiling, Math.max(0, Math.round(weight)))
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

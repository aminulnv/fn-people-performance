import type {
  CyclePurpose,
  GradeBandDefinition,
  ReviewPolicy,
  ReviewQuestion,
  ScorecardPillar,
} from './types'

export const DEFAULT_GRADE_BANDS: GradeBandDefinition[] = [
  { id: 'exceptional', label: 'Exceptional', sort: 1 },
  { id: 'exceeding', label: 'Exceeding', sort: 2 },
  { id: 'performing', label: 'Performing', sort: 3 },
  { id: 'developing', label: 'Developing', sort: 4 },
  { id: 'unsatisfactory', label: 'Unsatisfactory', sort: 5 },
]

export const DEFAULT_ANNUAL_PILLARS: ScorecardPillar[] = [
  {
    id: 'goals',
    kind: 'goals',
    label: 'Goals',
    enabled: true,
    weight: 50,
    pullLinkedQuarters: true,
  },
  {
    id: 'skills',
    kind: 'skills',
    label: 'Skills',
    enabled: true,
    weight: 25,
    pullLinkedQuarters: false,
  },
  {
    id: 'values',
    kind: 'values',
    label: 'Core Values',
    enabled: true,
    weight: 25,
    pullLinkedQuarters: false,
  },
]

export const DEFAULT_ANNUAL_QUESTIONS: ReviewQuestion[] = [
  {
    id: 'delivered',
    prompt: 'What did I deliver this year?',
    enabled: true,
    required: true,
    visibility: ['employee', 'manager', 'calibrators'],
  },
  {
    id: 'values',
    prompt: "How did I demonstrate FN's Core Values?",
    enabled: true,
    required: true,
    visibility: ['employee', 'manager', 'calibrators'],
  },
  {
    id: 'improve',
    prompt: 'What do I need to further improve on?',
    enabled: true,
    required: false,
    visibility: ['employee', 'manager', 'calibrators'],
  },
  {
    id: 'support',
    prompt: 'Is the company giving me the support I need to perform at my optimal level?',
    enabled: true,
    required: false,
    visibility: ['employee', 'manager', 'calibrators'],
  },
  {
    id: 'retain',
    prompt: 'Will we do what it takes to retain this person?',
    enabled: true,
    required: false,
    visibility: ['calibrators'],
  },
]

export function defaultReviewPolicy(purpose: CyclePurpose = 'quarterly_checkin'): ReviewPolicy {
  const isAnnual = purpose === 'annual_appraisal'
  return {
    selfReview: {
      ratePillars: isAnnual,
      rateOverall: isAnnual,
      visibility: 'blinded',
      latePolicy: 'proceed',
    },
    managerReview: {
      narrative: isAnnual ? 'overall' : 'overall',
      gapCommentTiers: isAnnual ? 2 : 0,
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
      pillars: DEFAULT_ANNUAL_PILLARS.map((pillar) => ({ ...pillar })),
      questions: DEFAULT_ANNUAL_QUESTIONS.map((question) => ({
        ...question,
        visibility: [...question.visibility],
      })),
      bands: DEFAULT_GRADE_BANDS.map((band) => ({ ...band })),
      extraGradeFields: [],
    },
  }
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
      escalationRoles:
        policy.managerReview?.escalationRoles ?? defaults.managerReview.escalationRoles,
    },
    calibration: { ...defaults.calibration, ...policy.calibration },
    release: { ...defaults.release, ...policy.release },
    appeal: { ...defaults.appeal, ...policy.appeal },
    eligibility: { ...defaults.eligibility, ...policy.eligibility },
    scorecard: {
      pillars:
        policy.scorecard?.pillars?.length
          ? policy.scorecard.pillars
          : defaults.scorecard.pillars,
      questions:
        policy.scorecard?.questions?.length
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

import type {
  CyclePurpose,
  GradeBandDefinition,
  ReviewPolicy,
  ReviewQuestion,
  ReviewQuestionKind,
  ReviewQuestionOutputVisibility,
  ReviewQuestionVisibility,
  ScorecardFeedbackConfig,
  ScorecardPillar,
  ScorecardPillarKind,
} from './types'

export const DEFAULT_GRADE_BANDS: GradeBandDefinition[] = [
  { id: 'exceptional', label: 'Exceptional', sort: 1 },
  { id: 'exceeding', label: 'Exceeding', sort: 2 },
  { id: 'performing', label: 'Performing', sort: 3 },
  { id: 'developing', label: 'Developing', sort: 4 },
  { id: 'unsatisfactory', label: 'Unsatisfactory', sort: 5 },
]

export const REVIEW_QUESTION_KINDS: Array<{
  id: ReviewQuestionKind
  label: string
  hint: string
}> = [
  { id: 'open_ended', label: 'Open-ended', hint: 'Free-text answer' },
  { id: 'yes_no', label: 'Yes / No', hint: 'Binary choice' },
  { id: 'multiple_choice', label: 'Multiple choice', hint: 'Pick one option' },
]

/** Question types insertable from Add Question. */
export const FORM_ADD_BLOCK_OPTIONS: Array<{
  id: ReviewQuestionKind
  label: string
  hint: string
}> = [...REVIEW_QUESTION_KINDS]

export const DEFAULT_MULTIPLE_CHOICE_OPTIONS = ['Option 1', 'Option 2']
export const DEFAULT_DUAL_LABELS: [string, string] = ['Field 1', 'Field 2']

export const DEFAULT_SCORECARD_FEEDBACK: ScorecardFeedbackConfig = {
  enabled: false,
  title: 'Feedback',
  labels: ['Strengths', 'Areas Of Improvement'],
  required: false,
  visibility: ['employee', 'manager'],
  outputVisibility: ['employee', 'manager'],
}

export function normalizeScorecardFeedback(
  feedback?: Partial<ScorecardFeedbackConfig> | null,
): ScorecardFeedbackConfig {
  const labels =
    feedback?.labels?.length === 2
      ? ([feedback.labels[0] || 'Strengths', feedback.labels[1] || 'Areas Of Improvement'] as [
          string,
          string,
        ])
      : ([...DEFAULT_SCORECARD_FEEDBACK.labels] as [string, string])
  const enabled =
    typeof feedback?.enabled === 'boolean'
      ? feedback.enabled
      : feedback == null
        ? DEFAULT_SCORECARD_FEEDBACK.enabled
        : true
  return {
    enabled,
    title: feedback?.title?.trim() || DEFAULT_SCORECARD_FEEDBACK.title,
    labels,
    required: feedback?.required ?? DEFAULT_SCORECARD_FEEDBACK.required,
    visibility: feedback?.visibility?.length
      ? [...feedback.visibility]
      : [...DEFAULT_SCORECARD_FEEDBACK.visibility],
    outputVisibility: feedback?.outputVisibility?.length
      ? [...feedback.outputVisibility]
      : [...DEFAULT_SCORECARD_FEEDBACK.outputVisibility],
  }
}

export function updateScorecardFeedback(
  policy: ReviewPolicy,
  patch: Partial<ScorecardFeedbackConfig>,
): ReviewPolicy {
  return {
    ...policy,
    scorecard: {
      ...policy.scorecard,
      feedback: normalizeScorecardFeedback({
        ...policy.scorecard.feedback,
        ...patch,
      }),
    },
  }
}

export function updateOverallGrading(
  policy: ReviewPolicy,
  gradeOverall: boolean,
): ReviewPolicy {
  return {
    ...policy,
    managerReview: {
      ...policy.managerReview,
      gradeOverall,
    },
    selfReview: {
      ...policy.selfReview,
      rateOverall: gradeOverall,
    },
  }
}

export function normalizeReviewQuestion(
  question: Partial<ReviewQuestion> & Pick<ReviewQuestion, 'id' | 'prompt'>,
): ReviewQuestion {
  const kind = question.kind ?? 'open_ended'
  return {
    id: question.id,
    prompt: question.prompt ?? '',
    description: question.description?.trim() ? question.description : undefined,
    enabled: question.enabled ?? true,
    required: question.required ?? false,
    kind,
    options:
      kind === 'multiple_choice'
        ? question.options?.length
          ? [...question.options]
          : [...DEFAULT_MULTIPLE_CHOICE_OPTIONS]
        : question.options,
    dualLabels:
      kind === 'dual_text'
        ? question.dualLabels?.length === 2
          ? [question.dualLabels[0], question.dualLabels[1]]
          : [...DEFAULT_DUAL_LABELS]
        : question.dualLabels,
    visibility: question.visibility?.length
      ? [...question.visibility]
      : ['employee', 'manager', 'calibrators'],
    outputVisibility: question.outputVisibility?.length
      ? [...question.outputVisibility]
      : ['employee', 'manager'],
  }
}

export const DEFAULT_ANNUAL_QUESTIONS: ReviewQuestion[] = [
  {
    id: 'delivered',
    prompt: 'What did I deliver this year?',
    enabled: true,
    required: true,
    kind: 'open_ended',
    visibility: ['employee', 'manager', 'calibrators'],
    outputVisibility: ['employee', 'manager'],
  },
  {
    id: 'values',
    prompt: "How did I demonstrate FN's Core Values?",
    enabled: true,
    required: true,
    kind: 'open_ended',
    visibility: ['employee', 'manager', 'calibrators'],
    outputVisibility: ['employee', 'manager'],
  },
  {
    id: 'improve',
    prompt: 'What do I need to further improve on?',
    enabled: true,
    required: false,
    kind: 'open_ended',
    visibility: ['employee', 'manager', 'calibrators'],
    outputVisibility: ['employee', 'manager'],
  },
  {
    id: 'support',
    prompt: 'Is the company giving me the support I need to perform at my optimal level?',
    enabled: true,
    required: false,
    kind: 'open_ended',
    visibility: ['employee', 'manager', 'calibrators'],
    outputVisibility: ['employee', 'manager'],
  },
  {
    id: 'retain',
    prompt: 'Will we do what it takes to retain this person?',
    enabled: true,
    required: false,
    kind: 'open_ended',
    visibility: ['calibrators'],
    outputVisibility: ['manager'],
  },
]

/** Q1–Q3 manager check-in: one comment. No self-review question bank. */
export const DEFAULT_QUARTERLY_QUESTIONS: ReviewQuestion[] = [
  {
    id: 'quarter-comment',
    prompt: 'How did this person perform against their goals this quarter?',
    enabled: true,
    required: true,
    kind: 'open_ended',
    visibility: ['manager', 'calibrators'],
    outputVisibility: ['employee', 'manager'],
  },
]

/** Q4 is progress-only; the Goals grade is set later in Annual. */
export const DEFAULT_Q4_QUESTIONS: ReviewQuestion[] = [
  {
    id: 'q4-progress',
    prompt: 'What progress has been made on goals this quarter?',
    enabled: true,
    required: false,
    kind: 'open_ended',
    visibility: ['manager', 'calibrators'],
    outputVisibility: ['employee', 'manager'],
  },
]

export const QUESTION_VISIBILITY: Array<{
  id: ReviewQuestionVisibility
  label: string
  hint: string
}> = [
  { id: 'employee', label: 'Employee', hint: 'Shown on the self-review' },
  { id: 'manager', label: 'Manager', hint: 'Shown on the manager review' },
  { id: 'calibrators', label: 'Calibrators', hint: 'Shown to HOD, HRBP, and SLT' },
]

export const SCORECARD_PILLAR_CATALOG: ScorecardPillar[] = [
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
  {
    id: 'leadership',
    kind: 'leadership',
    label: 'Leadership Capabilities',
    enabled: false,
    weight: 0,
    pullLinkedQuarters: false,
  },
]

export type ScorecardTemplateId =
  | 'annual'
  | 'quarterly'
  | 'q4'
  | 'leadership'
  | 'blank'

export type ScorecardTemplate = {
  id: ScorecardTemplateId
  name: string
  hint: string
  pillars: ScorecardPillar[]
  questions: ReviewQuestion[]
}

function catalogWith(
  enabled: Array<[Exclude<ScorecardPillarKind, 'custom'>, number]>,
): ScorecardPillar[] {
  const weights = new Map<Exclude<ScorecardPillarKind, 'custom'>, number>(enabled)
  return SCORECARD_PILLAR_CATALOG.map((item) => {
    const weight =
      item.kind === 'custom' ? undefined : weights.get(item.kind)
    return {
      ...item,
      enabled: weight != null,
      weight: weight ?? 0,
    }
  })
}

export const SCORECARD_TEMPLATES: ScorecardTemplate[] = [
  {
    id: 'blank',
    name: 'Create form',
    hint: 'Start empty. Turn on the areas you want to grade and add your own questions.',
    pillars: catalogWith([['goals', 100]]),
    questions: [],
  },
  {
    id: 'annual',
    name: 'Annual appraisal',
    hint: 'Goals 50%, Skills 25%, Values 25%, plus the year-end questions.',
    pillars: catalogWith([
      ['goals', 50],
      ['skills', 25],
      ['values', 25],
    ]),
    questions: DEFAULT_ANNUAL_QUESTIONS.map((question) => ({
      ...question,
      visibility: [...question.visibility],
    })),
  },
  {
    id: 'quarterly',
    name: 'Q1–Q3 check-in',
    hint: 'Goals grade only (no overall). One manager comment. Employees do not self-rate.',
    pillars: catalogWith([['goals', 100]]),
    questions: DEFAULT_QUARTERLY_QUESTIONS.map((question) => ({
      ...question,
      visibility: [...question.visibility],
      outputVisibility: [...question.outputVisibility],
    })),
  },
  {
    id: 'q4',
    name: 'Q4 progress',
    hint: 'Goals progress only — no quarter grade. Q4 is graded inside Annual.',
    pillars: catalogWith([['goals', 100]]),
    questions: DEFAULT_Q4_QUESTIONS.map((question) => ({
      ...question,
      visibility: [...question.visibility],
      outputVisibility: [...question.outputVisibility],
    })),
  },
  {
    id: 'leadership',
    name: 'Leadership review',
    hint: 'Goals 50% and Leadership Capabilities 50%, with leadership questions.',
    pillars: catalogWith([
      ['goals', 50],
      ['leadership', 50],
    ]),
    questions: [
      {
        id: 'lead-delivered',
        prompt: 'What did this person deliver through their team this period?',
        enabled: true,
        required: true,
        kind: 'open_ended',
        visibility: ['employee', 'manager', 'calibrators'],
        outputVisibility: ['employee', 'manager'],
      },
      {
        id: 'lead-capability',
        prompt: 'How did they demonstrate leadership capability?',
        enabled: true,
        required: true,
        kind: 'open_ended',
        visibility: ['employee', 'manager', 'calibrators'],
        outputVisibility: ['employee', 'manager'],
      },
      {
        id: 'lead-retain',
        prompt: 'Will we do what it takes to retain this person?',
        enabled: true,
        required: false,
        kind: 'open_ended',
        visibility: ['calibrators'],
        outputVisibility: ['manager'],
      },
    ],
  },
]

export const SCORECARD_LIBRARY_TEMPLATES = SCORECARD_TEMPLATES

export function scorecardTemplateById(
  id: ScorecardTemplateId,
): ScorecardTemplate {
  return SCORECARD_TEMPLATES.find((item) => item.id === id) ?? SCORECARD_TEMPLATES[0]!
}

export function templateIdForPurpose(
  purpose: CyclePurpose,
  periodKey?: string,
): ScorecardTemplateId {
  if (purpose === 'annual_appraisal') return 'annual'
  if (purpose === 'custom') return 'blank'
  if (purpose === 'quarterly_checkin' && /^q4-\d{4}$/i.test(periodKey ?? '')) {
    return 'q4'
  }
  return 'quarterly'
}

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function cloneScorecardPart<T>(value: T): T {
  return structuredClone(value)
}

export function mergePillarCatalog(incoming?: ScorecardPillar[]): ScorecardPillar[] {
  const current = incoming ?? []
  const byKey = new Map(
    current.map((item) => [
      item.kind === 'custom' ? `custom:${item.id}` : item.kind,
      item,
    ]),
  )
  const standard = SCORECARD_PILLAR_CATALOG.map(
    (base) => byKey.get(base.kind) ?? { ...base, enabled: false, weight: 0 },
  )
  const custom = current.filter((item) => item.kind === 'custom')
  return [...standard, ...custom]
}

export function applyScorecardTemplate(
  policy: ReviewPolicy,
  templateId: ScorecardTemplateId,
): ReviewPolicy {
  const template = scorecardTemplateById(templateId)
  return {
    ...policy,
    scorecard: {
      ...policy.scorecard,
      pillars: cloneScorecardPart(template.pillars),
      questions: cloneScorecardPart(template.questions),
      bands: policy.scorecard.bands.length
        ? policy.scorecard.bands
        : DEFAULT_GRADE_BANDS.map((band) => ({ ...band })),
      feedback: normalizeScorecardFeedback(
        policy.scorecard.feedback ?? DEFAULT_SCORECARD_FEEDBACK,
      ),
    },
  }
}

export function addReviewQuestion(
  policy: ReviewPolicy,
  kind: ReviewQuestionKind = 'open_ended',
): ReviewPolicy {
  const question = normalizeReviewQuestion({
    id: nextId('question'),
    prompt: '',
    enabled: true,
    required: false,
    kind,
    visibility: ['employee', 'manager', 'calibrators'],
    outputVisibility: ['employee', 'manager'],
  })
  return {
    ...policy,
    scorecard: {
      ...policy.scorecard,
      questions: [...policy.scorecard.questions, question],
    },
  }
}

export function setReviewQuestionKind(
  policy: ReviewPolicy,
  questionId: string,
  kind: ReviewQuestionKind,
): ReviewPolicy {
  const question = policy.scorecard.questions.find((item) => item.id === questionId)
  if (!question || question.kind === kind) return policy
  return updateReviewQuestion(
    policy,
    questionId,
    normalizeReviewQuestion({
      ...question,
      kind,
      options: kind === 'multiple_choice' ? question.options : undefined,
      dualLabels: kind === 'dual_text' ? question.dualLabels : undefined,
    }),
  )
}

export function updateReviewQuestion(
  policy: ReviewPolicy,
  questionId: string,
  patch: Partial<ReviewQuestion>,
): ReviewPolicy {
  return {
    ...policy,
    scorecard: {
      ...policy.scorecard,
      questions: policy.scorecard.questions.map((question) =>
        question.id === questionId ? { ...question, ...patch } : question,
      ),
    },
  }
}

export function toggleQuestionVisibility(
  policy: ReviewPolicy,
  questionId: string,
  visibility: ReviewQuestionVisibility,
  on: boolean,
): ReviewPolicy {
  const question = policy.scorecard.questions.find((item) => item.id === questionId)
  if (!question) return policy
  const next = on
    ? [...new Set([...question.visibility, visibility])]
    : question.visibility.filter((item) => item !== visibility)
  return updateReviewQuestion(policy, questionId, {
    visibility: next.length > 0 ? next : question.visibility,
  })
}

export function toggleQuestionOutputVisibility(
  policy: ReviewPolicy,
  questionId: string,
  visibility: ReviewQuestionOutputVisibility,
  on: boolean,
): ReviewPolicy {
  const question = policy.scorecard.questions.find((item) => item.id === questionId)
  if (!question) return policy
  const current = question.outputVisibility ?? ['employee', 'manager']
  const next = on
    ? [...new Set([...current, visibility])]
    : current.filter((item) => item !== visibility)
  return updateReviewQuestion(policy, questionId, {
    outputVisibility: next.length > 0 ? next : current,
  })
}

export function removeReviewQuestion(
  policy: ReviewPolicy,
  questionId: string,
): ReviewPolicy {
  return {
    ...policy,
    scorecard: {
      ...policy.scorecard,
      questions: policy.scorecard.questions.filter(
        (question) => question.id !== questionId,
      ),
    },
  }
}

export function duplicateReviewQuestion(
  policy: ReviewPolicy,
  questionId: string,
): ReviewPolicy {
  const index = policy.scorecard.questions.findIndex(
    (question) => question.id === questionId,
  )
  if (index < 0) return policy
  const source = policy.scorecard.questions[index]!
  const copy = normalizeReviewQuestion({
    ...source,
    id: nextId('question'),
    prompt: source.prompt,
  })
  const questions = [...policy.scorecard.questions]
  questions.splice(index + 1, 0, copy)
  return {
    ...policy,
    scorecard: {
      ...policy.scorecard,
      questions,
    },
  }
}

export function moveReviewQuestion(
  policy: ReviewPolicy,
  questionId: string,
  direction: -1 | 1,
): ReviewPolicy {
  const index = policy.scorecard.questions.findIndex(
    (question) => question.id === questionId,
  )
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= policy.scorecard.questions.length) {
    return policy
  }
  const questions = [...policy.scorecard.questions]
  const [moved] = questions.splice(index, 1)
  questions.splice(nextIndex, 0, moved!)
  return {
    ...policy,
    scorecard: {
      ...policy.scorecard,
      questions,
    },
  }
}

export function updateScorecardPillar(
  policy: ReviewPolicy,
  pillarId: string,
  patch: Partial<ScorecardPillar>,
): ReviewPolicy {
  return {
    ...policy,
    scorecard: {
      ...policy.scorecard,
      pillars: policy.scorecard.pillars.map((item) =>
        item.id === pillarId ? { ...item, ...patch } : item,
      ),
    },
  }
}

export function addCustomPillar(
  policy: ReviewPolicy,
  label = 'Custom area',
): ReviewPolicy {
  const name = label.trim() || 'Custom area'
  const used = policy.scorecard.pillars
    .filter((pillar) => pillar.enabled)
    .reduce((sum, pillar) => sum + pillar.weight, 0)
  const pillar: ScorecardPillar = {
    id: nextId('custom'),
    kind: 'custom',
    label: name,
    enabled: true,
    weight: Math.max(0, 100 - used),
    pullLinkedQuarters: false,
  }
  return {
    ...policy,
    scorecard: {
      ...policy.scorecard,
      pillars: [...policy.scorecard.pillars, pillar],
    },
  }
}

export function removeScorecardPillar(
  policy: ReviewPolicy,
  pillarId: string,
): ReviewPolicy {
  const next: ReviewPolicy = {
    ...policy,
    scorecard: {
      ...policy.scorecard,
      pillars: policy.scorecard.pillars.filter((item) => item.id !== pillarId),
    },
  }
  return reweightAfterPillarChange(next)
}

/** @deprecated Prefer removeScorecardPillar — kept for older call sites. */
export function removeCustomPillar(
  policy: ReviewPolicy,
  pillarId: string,
): ReviewPolicy {
  return removeScorecardPillar(policy, pillarId)
}

function reweightAfterPillarChange(policy: ReviewPolicy): ReviewPolicy {
  const active = policy.scorecard.pillars.filter((pillar) => pillar.enabled)
  if (active.length === 0) return policy
  const total = active.reduce((sum, pillar) => sum + pillar.weight, 0)
  if (total <= 100) return policy
  const scale = 100 / total
  let allocated = 0
  const weights = active.map((pillar, index) => {
    if (index === active.length - 1) return Math.max(0, 100 - allocated)
    const next = Math.max(0, Math.round(pillar.weight * scale))
    allocated += next
    return next
  })
  const byId = new Map(active.map((pillar, index) => [pillar.id, weights[index]!]))
  return {
    ...policy,
    scorecard: {
      ...policy.scorecard,
      pillars: policy.scorecard.pillars.map((pillar) =>
        byId.has(pillar.id)
          ? { ...pillar, weight: byId.get(pillar.id)! }
          : pillar,
      ),
    },
  }
}
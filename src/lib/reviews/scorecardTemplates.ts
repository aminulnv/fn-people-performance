import type {
  CyclePurpose,
  GradeBandDefinition,
  ReviewPolicy,
  ReviewQuestion,
  ReviewQuestionVisibility,
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
    label: 'Leadership',
    enabled: false,
    weight: 0,
    pullLinkedQuarters: false,
  },
]

export type ScorecardTemplateId =
  | 'annual'
  | 'quarterly'
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
    name: 'Quarterly check-in',
    hint: 'Goals only. One manager comment. Employees do not self-rate.',
    pillars: catalogWith([['goals', 100]]),
    questions: [
      {
        id: 'quarter-comment',
        prompt: 'How did this person perform against their goals this quarter?',
        enabled: true,
        required: true,
        visibility: ['manager', 'calibrators'],
      },
    ],
  },
  {
    id: 'leadership',
    name: 'Leadership review',
    hint: 'Goals 50% and Leadership 50%, with leadership questions.',
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
        visibility: ['employee', 'manager', 'calibrators'],
      },
      {
        id: 'lead-capability',
        prompt: 'How did they demonstrate leadership capability?',
        enabled: true,
        required: true,
        visibility: ['employee', 'manager', 'calibrators'],
      },
      {
        id: 'lead-retain',
        prompt: 'Will we do what it takes to retain this person?',
        enabled: true,
        required: false,
        visibility: ['calibrators'],
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

export function templateIdForPurpose(purpose: CyclePurpose): ScorecardTemplateId {
  if (purpose === 'annual_appraisal') return 'annual'
  if (purpose === 'custom') return 'blank'
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
    },
  }
}

export function addReviewQuestion(policy: ReviewPolicy): ReviewPolicy {
  const question: ReviewQuestion = {
    id: nextId('question'),
    prompt: '',
    enabled: true,
    required: false,
    visibility: ['employee', 'manager', 'calibrators'],
  }
  return {
    ...policy,
    scorecard: {
      ...policy.scorecard,
      questions: [...policy.scorecard.questions, question],
    },
  }
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

export function addCustomPillar(policy: ReviewPolicy, label: string): ReviewPolicy {
  const name = label.trim()
  if (!name) return policy
  const pillar: ScorecardPillar = {
    id: nextId('custom'),
    kind: 'custom',
    label: name,
    enabled: true,
    weight: 0,
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

export function removeCustomPillar(
  policy: ReviewPolicy,
  pillarId: string,
): ReviewPolicy {
  return {
    ...policy,
    scorecard: {
      ...policy.scorecard,
      pillars: policy.scorecard.pillars.filter(
        (item) => !(item.kind === 'custom' && item.id === pillarId),
      ),
    },
  }
}
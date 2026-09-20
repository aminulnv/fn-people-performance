/** Server-side cycle stage / policy defaults. Mirrors src/lib/reviews. */

export const REVIEW_STAGE_ORDER = [
  'goals',
  'self_review',
  'manager_review',
  'calibration_hod_hrbp',
  'calibration_slt',
  'publish_managers',
  'publish_employees',
  'appeal',
]

export function inferPurpose(periodKey, fallback = 'custom') {
  if (!periodKey) return fallback
  if (/^annual-\d{4}$/i.test(periodKey) || /^h[12]-\d{4}$/i.test(periodKey)) {
    return 'annual_appraisal'
  }
  if (/^q[1-4]-\d{4}$/i.test(periodKey)) return 'quarterly_checkin'
  return fallback
}

export function inferYearKey(periodKey, startDate) {
  const fromPeriod = String(periodKey ?? '').match(/(\d{4})$/)?.[1]
  return fromPeriod ?? String(startDate ?? '').slice(0, 4) ?? null
}

export function cyclePurposeOf({ periodKey, type } = {}) {
  return inferPurpose(
    periodKey,
    type === 'custom' || type === 'ad-hoc' ? 'custom' : 'quarterly_checkin',
  )
}

export function isGoalsOnlyQuarter(periodKey) {
  return /^q4-\d{4}$/i.test(periodKey ?? '')
}

export function presetEnabledStages(purpose, periodKey) {
  if (purpose === 'quarterly_checkin' && isGoalsOnlyQuarter(periodKey)) {
    return ['goals']
  }
  if (purpose === 'annual_appraisal') {
    return [
      'self_review',
      'manager_review',
      'calibration_hod_hrbp',
      'calibration_slt',
      'publish_managers',
      'publish_employees',
      'appeal',
    ]
  }
  if (purpose === 'custom') return ['manager_review', 'publish_employees']
  return ['goals', 'manager_review', 'publish_employees']
}

export function cycleModulesOf(stages) {
  return {
    goals: Boolean(stages?.some((stage) => stage.id === 'goals' && stage.enabled)),
    reviews: Boolean(stages?.some((stage) => stage.id !== 'goals' && stage.enabled)),
  }
}

export function presetReviewFlowStages(purpose, periodKey) {
  const key = isGoalsOnlyQuarter(periodKey) ? undefined : periodKey
  return presetEnabledStages(purpose, key).filter((id) => id !== 'goals')
}

export function withRequiredReviewStages(config) {
  const reviewsOn = cycleModulesOf(config.reviewStages).reviews
  return syncLegacyStageWindows({
    ...config,
    reviewStages: (config.reviewStages ?? []).map((stage) =>
      stage.id === 'publish_employees'
        ? { ...stage, enabled: reviewsOn }
        : stage,
    ),
  })
}

export function applyCycleModules(config, modules, purpose, periodKey) {
  const reviewsWereOn = cycleModulesOf(config.reviewStages).reviews
  const reviewPreset = new Set(presetReviewFlowStages(purpose, periodKey))
  const reviewStages = (config.reviewStages ?? []).map((stage) => {
    if (stage.id === 'goals') return { ...stage, enabled: modules.goals }
    if (!modules.reviews) return { ...stage, enabled: false }
    if (
      (stage.id === 'calibration_hod_hrbp' || stage.id === 'calibration_slt') &&
      purpose !== 'annual_appraisal'
    ) {
      return { ...stage, enabled: false }
    }
    if (stage.id === 'publish_employees') return { ...stage, enabled: true }
    if (reviewsWereOn) return stage
    return { ...stage, enabled: reviewPreset.has(stage.id) }
  })
  return syncLegacyStageWindows({ ...config, reviewStages })
}

export function withoutUnsupportedCalibration(config, purpose) {
  if (purpose === 'annual_appraisal') return config
  return syncLegacyStageWindows({
    ...config,
    reviewStages: (config.reviewStages ?? []).map((stage) =>
      stage.id === 'calibration_hod_hrbp' || stage.id === 'calibration_slt'
        ? { ...stage, enabled: false }
        : stage,
    ),
  })
}

function at(date, time = '00:00') {
  const parsed = parseDateTime(date)
  return { date: parsed?.date ?? date, time }
}

export function deriveReviewStagesFromLegacy(purpose, config) {
  const annual = purpose === 'annual_appraisal'
  return defaultReviewStages(purpose, config).map((stage) => {
    if (stage.id === 'goals') return { ...stage, enabled: !annual }
    if (stage.id === 'self_review') return { ...stage, enabled: annual }
    if (stage.id === 'manager_review') return { ...stage, enabled: true }
    if (stage.id === 'calibration_hod_hrbp' || stage.id === 'calibration_slt') {
      return { ...stage, enabled: annual && Boolean(config.calibration.enabled) }
    }
    if (stage.id === 'publish_managers' || stage.id === 'publish_employees') {
      return { ...stage, enabled: true }
    }
    return { ...stage, enabled: annual }
  })
}

export function defaultReviewStages(purpose, config, periodKey) {
  const enabled = new Set(presetEnabledStages(purpose, periodKey))
  return REVIEW_STAGE_ORDER.map((id) => {
    if (id === 'goals') {
      return {
        id,
        enabled: enabled.has(id),
        start: at(config.goals.employee.startDate),
        end: at(config.goals.employee.endDate),
      }
    }
    if (id === 'self_review') {
      return {
        id,
        enabled: enabled.has(id),
        start: { ...config.performance.employeeStart },
        end: { ...config.performance.employeeEnd },
      }
    }
    if (id === 'manager_review') {
      return {
        id,
        enabled: enabled.has(id),
        start: { ...config.performance.managerStart },
        end: { ...config.performance.managerEnd },
      }
    }
    if (id === 'calibration_hod_hrbp' || id === 'calibration_slt') {
      return {
        id,
        enabled: enabled.has(id) && config.calibration.enabled,
        start: { ...config.calibration.start },
        end: { ...config.calibration.end },
      }
    }
    if (id === 'publish_managers') {
      return {
        id,
        enabled: enabled.has(id),
        start: { ...config.publish.toManager },
        end: { ...config.publish.toManager },
      }
    }
    if (id === 'publish_employees') {
      return {
        id,
        enabled: enabled.has(id),
        start: { ...config.publish.toAll },
        end: { ...config.publish.toAll },
      }
    }
    return {
      id,
      enabled: enabled.has(id),
      start: { ...config.publish.toAll },
      end: { ...config.publish.toAll },
    }
  })
}

function datePart(value) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? ''))
  return match?.[1] ?? ''
}

function parseDateTime(value) {
  const raw = String(value ?? '')
  const datetime = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(raw)
  if (datetime) return { date: datetime[1], time: datetime[2] }
  const date = datePart(raw)
  return date ? { date, time: '00:00' } : null
}

export function applyNestedWindowsToReviewStages(config) {
  const at = (value, fallbackTime = '00:00') => {
    const parsed = parseDateTime(value)
    if (!parsed) return { date: value, time: fallbackTime }
    return {
      date: parsed.date,
      time: /T\d{2}:\d{2}/.test(String(value ?? '')) ? parsed.time : fallbackTime,
    }
  }
  return {
    ...config,
    reviewStages: (config.reviewStages ?? []).map((stage) => {
      if (stage.id === 'goals') {
        return {
          ...stage,
          start: at(config.goals.employee.startDate, stage.start?.time),
          end: at(config.goals.employee.endDate, stage.end?.time),
        }
      }
      if (stage.id === 'self_review') {
        return {
          ...stage,
          start: config.performance.employeeStart,
          end: config.performance.employeeEnd,
        }
      }
      if (stage.id === 'manager_review') {
        return {
          ...stage,
          start: config.performance.managerStart,
          end: config.performance.managerEnd,
        }
      }
      if (stage.id === 'calibration_hod_hrbp' || stage.id === 'calibration_slt') {
        return {
          ...stage,
          start: config.calibration.start,
          end: config.calibration.end,
        }
      }
      if (stage.id === 'publish_managers') {
        return {
          ...stage,
          start: config.publish.toManager,
          end: config.publish.toManager,
        }
      }
      return {
        ...stage,
        start: config.publish.toAll,
        end: config.publish.toAll,
      }
    }),
  }
}

export function mergeReviewStages(incoming, fallback) {
  return REVIEW_STAGE_ORDER.map((id) => {
    const next = incoming?.find((stage) => stage.id === id)
    const base = fallback.find((stage) => stage.id === id)
    return {
      id,
      enabled: next?.enabled ?? base?.enabled ?? false,
      start: next?.start ?? base?.start,
      end: next?.end ?? base?.end,
    }
  })
}

export function syncLegacyStageWindows(config) {
  const byId = new Map((config.reviewStages ?? []).map((stage) => [stage.id, stage]))
  const goals = byId.get('goals')
  const selfReview = byId.get('self_review')
  const manager = byId.get('manager_review')
  const hod = byId.get('calibration_hod_hrbp')
  const slt = byId.get('calibration_slt')
  const pubMgr = byId.get('publish_managers')
  const pubEmp = byId.get('publish_employees')
  return {
    ...config,
    goals: {
      ...config.goals,
      employee: {
        startDate: goals?.start?.date ?? config.goals.employee.startDate,
        endDate: goals?.end?.date ?? config.goals.employee.endDate,
      },
    },
    performance: {
      employeeStart: selfReview?.start ?? config.performance.employeeStart,
      employeeEnd: selfReview?.end ?? config.performance.employeeEnd,
      managerStart: manager?.start ?? config.performance.managerStart,
      managerEnd: manager?.end ?? config.performance.managerEnd,
    },
    calibration: {
      ...config.calibration,
      enabled: Boolean(hod?.enabled || slt?.enabled),
      start: hod?.start ?? slt?.start ?? config.calibration.start,
      end: slt?.end ?? hod?.end ?? config.calibration.end,
      manualStart: hod?.start ?? config.calibration.manualStart,
    },
    publish: {
      toManager: pubMgr?.start ?? config.publish.toManager,
      toAll: pubEmp?.start ?? config.publish.toAll,
    },
  }
}

const DEFAULT_GRADE_BANDS = [
  { id: 'exceptional', label: 'Exceptional', sort: 1 },
  { id: 'exceeding', label: 'Exceeding', sort: 2 },
  { id: 'performing', label: 'Performing', sort: 3 },
  { id: 'developing', label: 'Developing', sort: 4 },
  { id: 'unsatisfactory', label: 'Unsatisfactory', sort: 5 },
]

const ANNUAL_QUESTIONS = [
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

const QUARTERLY_QUESTIONS = [
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

const Q4_QUESTIONS = [
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

/** Mirrors client scorecard templates: quarterly = goals only; annual = goals/skills/values. */
function defaultScorecard(purpose, periodKey) {
  if (purpose === 'annual_appraisal') {
    return {
      pillars: [
        { id: 'goals', kind: 'goals', label: 'Goals', enabled: true, weight: 50, pullLinkedQuarters: true },
        { id: 'skills', kind: 'skills', label: 'Skills', enabled: true, weight: 25, pullLinkedQuarters: false },
        { id: 'values', kind: 'values', label: 'Core Values', enabled: true, weight: 25, pullLinkedQuarters: false },
      ],
      questions: ANNUAL_QUESTIONS.map((question) => ({ ...question })),
      bands: DEFAULT_GRADE_BANDS.map((band) => ({ ...band })),
      extraGradeFields: [],
      feedback: {
        enabled: true,
        title: 'Feedback',
        labels: ['Strengths', 'Areas Of Improvement'],
        required: false,
        visibility: ['employee', 'manager'],
        outputVisibility: ['employee', 'manager'],
      },
    }
  }
  const isQ4 =
    purpose === 'quarterly_checkin' && isGoalsOnlyQuarter(periodKey)
  // quarterly_checkin and custom/blank: goals only — no Skills or Core Values
  return {
    pillars: [
      { id: 'goals', kind: 'goals', label: 'Goals', enabled: true, weight: 100, pullLinkedQuarters: true },
      { id: 'skills', kind: 'skills', label: 'Skills', enabled: false, weight: 0, pullLinkedQuarters: false },
      { id: 'values', kind: 'values', label: 'Core Values', enabled: false, weight: 0, pullLinkedQuarters: false },
      {
        id: 'leadership',
        kind: 'leadership',
        label: 'Leadership Capabilities',
        enabled: false,
        weight: 0,
        pullLinkedQuarters: false,
      },
    ],
    questions:
      purpose === 'custom'
        ? []
        : (isQ4 ? Q4_QUESTIONS : QUARTERLY_QUESTIONS).map((question) => ({
            ...question,
          })),
    bands: DEFAULT_GRADE_BANDS.map((band) => ({ ...band })),
    extraGradeFields: [],
    feedback: {
      enabled: true,
      title: 'Feedback',
      labels: ['Strengths', 'Areas Of Improvement'],
      required: false,
      visibility: ['employee', 'manager'],
      outputVisibility: ['employee', 'manager'],
    },
  }
}

export function defaultReviewPolicy(purpose = 'quarterly_checkin', periodKey) {
  const isAnnual = purpose === 'annual_appraisal'
  // Q1–Q3: goals on / overall off · Q4: both off · Annual: both on
  const isQ4 =
    purpose === 'quarterly_checkin' && isGoalsOnlyQuarter(periodKey)
  const gradeGoals = isAnnual || !isQ4
  const gradeOverall = isAnnual
  return {
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
    scorecard: defaultScorecard(purpose, periodKey),
  }
}

function stripUnusedManagerFields(managerReview) {
  const {
    goalsScoreEdit: _goalsScore,
    finalGradeEdit: _finalGrade,
    ...rest
  } = managerReview
  return rest
}

export function normalizeReviewPolicy(policy, purpose = 'quarterly_checkin', periodKey) {
  const defaults = defaultReviewPolicy(purpose, periodKey)
  const gradeLocks = lockedGradeTogglesForCycle(purpose, periodKey)
  if (!policy || typeof policy !== 'object' || Array.isArray(policy) || Object.keys(policy).length === 0) {
    return defaults
  }
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
        : (policy.managerReview?.gradeOverall ?? defaults.managerReview.gradeOverall),
      escalationRoles:
        policy.managerReview?.escalationRoles ?? defaults.managerReview.escalationRoles,
    }),
    calibration: { ...defaults.calibration, ...policy.calibration },
    eligibility: { ...defaults.eligibility, ...policy.eligibility },
    scorecard: {
      pillars: policy.scorecard?.pillars?.length
        ? policy.scorecard.pillars
        : defaults.scorecard.pillars,
      questions: Array.isArray(policy.scorecard?.questions) &&
        (policy.scorecard.questions.length > 0 || purpose === 'custom')
        ? policy.scorecard.questions.map((question) => {
            const kind = question.kind ?? 'open_ended'
            return {
              ...question,
              kind,
              options:
                kind === 'multiple_choice'
                  ? question.options?.length
                    ? question.options
                    : ['Option 1', 'Option 2']
                  : question.options,
              dualLabels:
                kind === 'dual_text'
                  ? question.dualLabels?.length === 2
                    ? question.dualLabels
                    : ['Field 1', 'Field 2']
                  : question.dualLabels,
              outputVisibility: question.outputVisibility?.length
                ? question.outputVisibility
                : ['employee', 'manager'],
            }
          })
        : defaults.scorecard.questions,
      bands: policy.scorecard?.bands?.length
        ? policy.scorecard.bands
        : defaults.scorecard.bands,
      extraGradeFields: policy.scorecard?.extraGradeFields ?? [],
      feedback: (() => {
        const incoming = policy.scorecard?.feedback
        const labels =
          incoming?.labels?.length === 2
            ? incoming.labels
            : ['Strengths', 'Areas Of Improvement']
        return {
          enabled: incoming?.enabled ?? true,
          title: incoming?.title?.trim() || 'Feedback',
          labels,
          required: incoming?.required ?? false,
          visibility: incoming?.visibility?.length
            ? incoming.visibility
            : ['employee', 'manager'],
          outputVisibility: incoming?.outputVisibility?.length
            ? incoming.outputVisibility
            : ['employee', 'manager'],
        }
      })(),
    },
  }
}

export function lockedGradeTogglesForCycle(purpose, periodKey) {
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

/** Line manager and self review are the only review types. */
export function normalizeReviewTypes(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    line_manager: true,
    self: source.self === true,
  }
}

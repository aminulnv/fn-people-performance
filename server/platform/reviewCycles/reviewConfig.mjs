/** Server-side cycle purpose / stage / policy defaults. Mirrors src/lib/reviews. */

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
  if (/^annual-\d{4}$/i.test(periodKey)) return 'annual_appraisal'
  if (/^q[1-4]-\d{4}$/i.test(periodKey)) return 'quarterly_checkin'
  return fallback
}

export function inferYearKey(periodKey, startDate) {
  const fromPeriod = String(periodKey ?? '').match(/(\d{4})$/)?.[1]
  return fromPeriod ?? String(startDate ?? '').slice(0, 4) ?? null
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
  if (purpose === 'custom') return ['manager_review']
  return ['goals', 'manager_review']
}

function at(date, time = '00:00') {
  return { date, time }
}

export function deriveReviewStagesFromLegacy(purpose, config) {
  const annual = purpose === 'annual_appraisal'
  return defaultReviewStages(purpose, config).map((stage) => {
    if (stage.id === 'goals') return { ...stage, enabled: !annual }
    if (stage.id === 'self_review') return { ...stage, enabled: annual }
    if (stage.id === 'manager_review') return { ...stage, enabled: true }
    if (stage.id === 'calibration_hod_hrbp') {
      return { ...stage, enabled: Boolean(config.calibration.enabled) }
    }
    if (stage.id === 'calibration_slt') {
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

export function applyNestedWindowsToReviewStages(config) {
  const at = (date, time = '00:00') => ({ date, time })
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

export function defaultReviewPolicy(purpose = 'quarterly_checkin') {
  const isAnnual = purpose === 'annual_appraisal'
  return {
    selfReview: {
      ratePillars: isAnnual,
      rateOverall: isAnnual,
      visibility: 'blinded',
      latePolicy: 'proceed',
    },
    managerReview: {
      narrative: 'overall',
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
    appeal: { mode: 'record_only', days: 7 },
    eligibility: {
      excludeNoticePeriod: true,
      excludeProbation: false,
      excludePip: false,
    },
    scorecard: {
      pillars: [
        { id: 'goals', kind: 'goals', label: 'Goals', enabled: true, weight: 50, pullLinkedQuarters: true },
        { id: 'skills', kind: 'skills', label: 'Skills', enabled: true, weight: 25, pullLinkedQuarters: false },
        { id: 'values', kind: 'values', label: 'Core Values', enabled: true, weight: 25, pullLinkedQuarters: false },
      ],
      questions: [
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
      ],
      bands: [
        { id: 'exceptional', label: 'Exceptional', sort: 1 },
        { id: 'exceeding', label: 'Exceeding', sort: 2 },
        { id: 'performing', label: 'Performing', sort: 3 },
        { id: 'developing', label: 'Developing', sort: 4 },
        { id: 'unsatisfactory', label: 'Unsatisfactory', sort: 5 },
      ],
      extraGradeFields: [],
    },
  }
}

export function normalizeReviewPolicy(policy, purpose = 'quarterly_checkin') {
  const defaults = defaultReviewPolicy(purpose)
  if (!policy || typeof policy !== 'object' || Array.isArray(policy) || Object.keys(policy).length === 0) {
    return defaults
  }
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
      pillars: policy.scorecard?.pillars?.length
        ? policy.scorecard.pillars
        : defaults.scorecard.pillars,
      questions: policy.scorecard?.questions?.length
        ? policy.scorecard.questions
        : defaults.scorecard.questions,
      bands: policy.scorecard?.bands?.length
        ? policy.scorecard.bands
        : defaults.scorecard.bands,
      extraGradeFields: policy.scorecard?.extraGradeFields ?? [],
    },
  }
}

import { hasExplicitTime, parseDateTime } from '@/lib/dates/timestamp'
import type {
  CycleModules,
  CyclePurpose,
  CycleStagesConfig,
  DateTimeValue,
  ReviewStageConfig,
  ReviewStageId,
} from './types'

export const REVIEW_STAGE_ORDER: ReviewStageId[] = [
  'goals',
  'self_review',
  'manager_review',
  'calibration_hod_hrbp',
  'calibration_slt',
  'publish_managers',
  'publish_employees',
  'appeal',
]

/** Review-module stages. Goal setting belongs to the Goals module, not this list. */
export const REVIEW_FLOW_STAGE_ORDER: ReviewStageId[] = REVIEW_STAGE_ORDER.filter(
  (id) => id !== 'goals',
)

/** Milestone stages: one visible-from date, not an open/close window. */
export function isPublishStage(id: ReviewStageId): boolean {
  return id === 'publish_managers' || id === 'publish_employees'
}

export const REVIEW_STAGE_LABEL: Record<ReviewStageId, string> = {
  goals: 'Goal setting',
  self_review: 'Self-review',
  manager_review: 'Manager review',
  calibration_hod_hrbp: 'HOD / HRBP calibration',
  calibration_slt: 'SLT calibration',
  publish_managers: 'Release to managers',
  publish_employees: 'Release to employees',
  appeal: 'Appeal',
}

export const REVIEW_STAGE_HINT: Record<ReviewStageId, string> = {
  goals: 'Employees write and submit goals for this cycle.',
  self_review: 'Employees rate themselves and write a year narrative.',
  manager_review: 'The line manager rates the person and submits a grade.',
  calibration_hod_hrbp: 'HOD and HRBP align grades across the department.',
  calibration_slt: 'SLT reviews the department outcome with the HOD.',
  publish_managers: 'Line managers see the final grade first.',
  publish_employees: 'People see their own final grade after managers.',
  appeal: 'Employee can leave a written record after release.',
}

const DEFAULT_TIME = '00:00'

function at(date: string, time = DEFAULT_TIME): DateTimeValue {
  const parsed = parseDateTime(date)
  return { date: parsed?.date ?? date, time }
}

export function isGoalsOnlyQuarter(periodKey?: string): boolean {
  return /^q4-\d{4}$/i.test(periodKey ?? '')
}

export function presetEnabledStages(
  purpose: CyclePurpose,
  periodKey?: string,
): ReviewStageId[] {
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
  if (purpose === 'custom') {
    return ['manager_review']
  }
  return ['goals', 'manager_review']
}

export function cycleModulesOf(
  stages: ReviewStageConfig[] | undefined,
): CycleModules {
  return {
    goals: Boolean(stages?.some((stage) => stage.id === 'goals' && stage.enabled)),
    reviews: Boolean(
      stages?.some((stage) => stage.id !== 'goals' && stage.enabled),
    ),
  }
}

export function isGoalsModuleEnabled(
  stages: ReviewStageConfig[] | undefined,
): boolean {
  return cycleModulesOf(stages).goals
}

export function isReviewsModuleEnabled(
  stages: ReviewStageConfig[] | undefined,
): boolean {
  return cycleModulesOf(stages).reviews
}

export function presetCycleModules(
  purpose: CyclePurpose,
  periodKey?: string,
): CycleModules {
  const enabled = presetEnabledStages(purpose, periodKey)
  return {
    goals: enabled.includes('goals'),
    reviews: enabled.some((id) => id !== 'goals'),
  }
}

/**
 * Stages to turn on when the Reviews module is enabled.
 * Q4's goals-only preset is Reviews off — turning Reviews on uses the
 * normal quarterly check-in (manager only), not a second Q4 lock.
 */
export function presetReviewFlowStages(
  purpose: CyclePurpose,
  periodKey?: string,
): ReviewStageId[] {
  const key = isGoalsOnlyQuarter(periodKey) ? undefined : periodKey
  return presetEnabledStages(purpose, key).filter((id) => id !== 'goals')
}

export function applyCycleModules(
  config: CycleStagesConfig,
  modules: CycleModules,
  purpose: CyclePurpose,
  periodKey?: string,
): CycleStagesConfig {
  const reviewsWereOn = isReviewsModuleEnabled(config.reviewStages)
  const reviewPreset = new Set(presetReviewFlowStages(purpose, periodKey))
  const reviewStages = (config.reviewStages ?? []).map((stage) => {
    if (stage.id === 'goals') {
      return { ...stage, enabled: modules.goals }
    }
    if (!modules.reviews) {
      return { ...stage, enabled: false }
    }
    if (reviewsWereOn) return stage
    return { ...stage, enabled: reviewPreset.has(stage.id) }
  })
  return syncLegacyStageWindows({
    ...config,
    reviewStages,
  })
}

/** Used when loading cycles that predate the reviewStages field. */
export function deriveReviewStagesFromLegacy(
  purpose: CyclePurpose,
  config: Omit<CycleStagesConfig, 'reviewStages'>,
): ReviewStageConfig[] {
  const annual = purpose === 'annual_appraisal'
  return REVIEW_STAGE_ORDER.map((id) => {
    const base = defaultReviewStages(purpose, config).find((stage) => stage.id === id)!
    if (id === 'goals') return { ...base, enabled: !annual }
    if (id === 'self_review') return { ...base, enabled: annual }
    if (id === 'manager_review') return { ...base, enabled: true }
    if (id === 'calibration_hod_hrbp') {
      return { ...base, enabled: config.calibration.enabled }
    }
    if (id === 'calibration_slt') {
      return { ...base, enabled: annual && config.calibration.enabled }
    }
    if (id === 'publish_managers' || id === 'publish_employees') {
      return { ...base, enabled: true }
    }
    return { ...base, enabled: annual }
  })
}

export function defaultReviewStages(
  purpose: CyclePurpose,
  config: Omit<CycleStagesConfig, 'reviewStages'>,
  periodKey?: string,
): ReviewStageConfig[] {
  const enabled = new Set(presetEnabledStages(purpose, periodKey))
  return REVIEW_STAGE_ORDER.map((id) => {
    switch (id) {
      case 'goals':
        return {
          id,
          enabled: enabled.has(id),
          start: at(config.goals.employee.startDate),
          end: at(config.goals.employee.endDate),
        }
      case 'self_review':
        return {
          id,
          enabled: enabled.has(id),
          start: { ...config.performance.employeeStart },
          end: { ...config.performance.employeeEnd },
        }
      case 'manager_review':
        return {
          id,
          enabled: enabled.has(id),
          start: { ...config.performance.managerStart },
          end: { ...config.performance.managerEnd },
        }
      case 'calibration_hod_hrbp':
        return {
          id,
          enabled: enabled.has(id) && config.calibration.enabled,
          start: { ...config.calibration.start },
          end: { ...config.calibration.end },
        }
      case 'calibration_slt':
        return {
          id,
          enabled: enabled.has(id) && config.calibration.enabled,
          start: { ...config.calibration.start },
          end: { ...config.calibration.end },
        }
      case 'publish_managers':
        return {
          id,
          enabled: enabled.has(id),
          start: { ...config.publish.toManager },
          end: { ...config.publish.toManager },
        }
      case 'publish_employees':
        return {
          id,
          enabled: enabled.has(id),
          start: { ...config.publish.toAll },
          end: { ...config.publish.toAll },
        }
      case 'appeal':
        return {
          id,
          enabled: enabled.has(id),
          start: { ...config.publish.toAll },
          end: { ...config.publish.toAll },
        }
    }
  })
}

export function enabledReviewStages(
  stages: ReviewStageConfig[] | undefined,
): ReviewStageConfig[] {
  return REVIEW_STAGE_ORDER.map((id) =>
    stages?.find((stage) => stage.id === id),
  ).filter((stage): stage is ReviewStageConfig => Boolean(stage?.enabled))
}

export function nextEnabledStage(
  stages: ReviewStageConfig[] | undefined,
  after: ReviewStageId,
): ReviewStageConfig | null {
  const index = REVIEW_STAGE_ORDER.indexOf(after)
  return (
    enabledReviewStages(stages).find(
      (stage) => REVIEW_STAGE_ORDER.indexOf(stage.id) > index,
    ) ?? null
  )
}

export function getReviewStage(
  stages: ReviewStageConfig[] | undefined,
  id: ReviewStageId,
): ReviewStageConfig | undefined {
  return stages?.find((stage) => stage.id === id)
}

/** Keep the legacy nested windows in sync so Goals keeps reading the same fields. */
export function syncLegacyStageWindows(
  config: CycleStagesConfig,
): CycleStagesConfig {
  const stages = config.reviewStages ?? []
  const byId = new Map(stages.map((stage) => [stage.id, stage]))
  const goals = byId.get('goals')
  const selfReview = byId.get('self_review')
  const manager = byId.get('manager_review')
  const hod = byId.get('calibration_hod_hrbp')
  const slt = byId.get('calibration_slt')
  const pubMgr = byId.get('publish_managers')
  const pubEmp = byId.get('publish_employees')
  const anyCalibration = Boolean(hod?.enabled || slt?.enabled)

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
      enabled: anyCalibration,
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

/** Keep stage dates aligned with the nested windows Goals already edits. */
export function applyNestedWindowsToReviewStages(
  config: CycleStagesConfig,
): CycleStagesConfig {
  const at = (value: string, fallbackTime = '00:00'): DateTimeValue => {
    const parsed = parseDateTime(value)
    if (!parsed) return { date: value, time: fallbackTime }
    return {
      date: parsed.date,
      time: hasExplicitTime(value) ? parsed.time : fallbackTime,
    }
  }
  return {
    ...config,
    reviewStages: (config.reviewStages ?? []).map((stage) => {
      switch (stage.id) {
        case 'goals':
          return {
            ...stage,
            start: at(config.goals.employee.startDate, stage.start?.time),
            end: at(config.goals.employee.endDate, stage.end?.time),
          }
        case 'self_review':
          return {
            ...stage,
            start: config.performance.employeeStart,
            end: config.performance.employeeEnd,
          }
        case 'manager_review':
          return {
            ...stage,
            start: config.performance.managerStart,
            end: config.performance.managerEnd,
          }
        case 'calibration_hod_hrbp':
        case 'calibration_slt':
          return {
            ...stage,
            start: config.calibration.start,
            end: config.calibration.end,
          }
        case 'publish_managers':
          return {
            ...stage,
            start: config.publish.toManager,
            end: config.publish.toManager,
          }
        case 'publish_employees':
        case 'appeal':
          return {
            ...stage,
            start: config.publish.toAll,
            end: config.publish.toAll,
          }
        default:
          return stage
      }
    }),
  }
}

export function mergeReviewStages(
  incoming: ReviewStageConfig[] | undefined,
  fallback: ReviewStageConfig[],
): ReviewStageConfig[] {
  return REVIEW_STAGE_ORDER.map((id) => {
    const next = incoming?.find((stage) => stage.id === id)
    const base = fallback.find((stage) => stage.id === id)
    if (!next && !base) {
      return { id, enabled: false }
    }
    return {
      id,
      enabled: next?.enabled ?? base?.enabled ?? false,
      start: next?.start ?? base?.start,
      end: next?.end ?? base?.end,
    }
  })
}

export function describeEnabledFlow(stages: ReviewStageConfig[] | undefined): string {
  const labels = enabledReviewStages(stages)
    .filter((stage) => stage.id !== 'goals')
    .map((stage) => REVIEW_STAGE_LABEL[stage.id])
  if (labels.length === 0) return 'No review stages are on.'
  return labels.join(' → ')
}

export function describeCycleModules(
  stages: ReviewStageConfig[] | undefined,
): string {
  const { goals, reviews } = cycleModulesOf(stages)
  if (goals && reviews) return 'Goals and reviews.'
  if (goals) return 'Goals only.'
  if (reviews) return 'Reviews only.'
  return 'No modules are on.'
}

export function describeCycleSetup(
  stages: ReviewStageConfig[] | undefined,
): string {
  const modules = describeCycleModules(stages)
  if (!isReviewsModuleEnabled(stages)) return modules
  return `${modules} ${describeEnabledFlow(stages)}`
}

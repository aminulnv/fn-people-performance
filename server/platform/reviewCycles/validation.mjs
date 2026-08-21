/** Shared cycle validation helpers for the platform API. */

import {
  applyNestedWindowsToReviewStages,
  defaultReviewStages,
  deriveReviewStagesFromLegacy,
  mergeReviewStages,
  syncLegacyStageWindows,
} from './reviewConfig.mjs'

function parseIso(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(Date.UTC(y, m - 1, d))
}

function toIso(date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date, days) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function at(date) {
  return { date, time: '00:00' }
}

export function buildDefaultStagesConfig(startDate, endDate, purpose = 'quarterly_checkin', periodKey) {
  const start = parseIso(startDate)
  const end = parseIso(endDate)
  if (!start || !end) {
    const fallback = {
      processMode: 'schedule',
      goals: {
        employee: { startDate, endDate },
        extensions: [],
      },
      performance: {
        employeeStart: at(startDate),
        employeeEnd: at(endDate),
        managerStart: at(startDate),
        managerEnd: at(endDate),
      },
      calibration: {
        enabled: purpose !== 'quarterly_checkin',
        start: at(endDate),
        end: at(endDate),
        manualStart: at(endDate),
      },
      publish: {
        toManager: at(endDate),
        toAll: at(endDate),
      },
    }
    return syncLegacyStageWindows({
      ...fallback,
      reviewStages: defaultReviewStages(purpose, fallback, periodKey),
    })
  }

  const goalsStart = addDays(start, -25)
  const employeeGoalsEnd = addDays(start, 0)
  const reviewStart = addDays(end, -9)
  const reviewEnd = addDays(end, 8)
  const calStart = reviewEnd
  const calEnd = addDays(calStart, 7)
  const publishManagers = addDays(calEnd, 3)
  const publishEmployees = addDays(publishManagers, 7)

  const built = {
    processMode: 'schedule',
    goals: {
      employee: {
        startDate: toIso(goalsStart),
        endDate: toIso(employeeGoalsEnd),
      },
      extensions: [],
    },
    performance: {
      employeeStart: at(toIso(reviewStart)),
      employeeEnd: at(toIso(reviewEnd)),
      managerStart: at(toIso(reviewStart)),
      managerEnd: at(toIso(reviewEnd)),
    },
    calibration: {
      enabled: purpose !== 'quarterly_checkin',
      start: at(toIso(calStart)),
      end: at(toIso(calEnd)),
      manualStart: at(toIso(calStart)),
    },
    publish: {
      toManager: at(toIso(publishManagers)),
      toAll: at(toIso(publishEmployees)),
    },
  }
  return syncLegacyStageWindows({
    ...built,
    reviewStages: defaultReviewStages(purpose, built, periodKey),
  })
}

export function normalizeStagesConfig(config, quarter = {}) {
  const startDate = quarter.startDate ?? '2026-07-01'
  const endDate = quarter.endDate ?? '2026-09-30'
  const purpose = quarter.purpose ?? 'quarterly_checkin'
  const defaults = buildDefaultStagesConfig(
    startDate,
    endDate,
    purpose,
    quarter.periodKey,
  )
  if (!config) return defaults

  const merged = {
    processMode: 'schedule',
    goals: {
      employee: config.goals?.employee ?? defaults.goals.employee,
      extensions: config.goals?.extensions ?? [],
    },
    performance: {
      ...defaults.performance,
      ...config.performance,
      employeeStart: {
        ...defaults.performance.employeeStart,
        ...config.performance?.employeeStart,
      },
      employeeEnd: {
        ...defaults.performance.employeeEnd,
        ...config.performance?.employeeEnd,
      },
      managerStart: {
        ...defaults.performance.managerStart,
        ...config.performance?.managerStart,
      },
      managerEnd: {
        ...defaults.performance.managerEnd,
        ...config.performance?.managerEnd,
      },
    },
    calibration: {
      ...defaults.calibration,
      ...config.calibration,
      start: {
        ...defaults.calibration.start,
        ...config.calibration?.start,
      },
      end: {
        ...defaults.calibration.end,
        ...config.calibration?.end,
      },
      manualStart: {
        ...defaults.calibration.manualStart,
        ...config.calibration?.manualStart,
      },
    },
    publish: {
      ...defaults.publish,
      ...config.publish,
      toManager: {
        ...defaults.publish.toManager,
        ...config.publish?.toManager,
      },
      toAll: {
        ...defaults.publish.toAll,
        ...config.publish?.toAll,
      },
    },
  }
  merged.reviewStages = mergeReviewStages(
    config.reviewStages,
    config.reviewStages?.length
      ? defaultReviewStages(purpose, merged)
      : deriveReviewStagesFromLegacy(purpose, merged),
  )
  return syncLegacyStageWindows(applyNestedWindowsToReviewStages(merged))
}

function validationError(message) {
  const err = new Error(message)
  err.statusCode = 400
  return err
}

export function validateGoalCountPolicy(policy) {
  const values = [
    policy.minimumRequired,
    policy.recommendedMinimum,
    policy.recommendedMaximum,
  ]
  if (values.some((value) => !Number.isInteger(value) || value < 1)) {
    throw validationError(
      'Goal-count values must be whole numbers greater than zero.',
    )
  }
  if (policy.recommendedMinimum < policy.minimumRequired) {
    throw validationError(
      'Recommended minimum cannot be lower than the required minimum.',
    )
  }
  if (policy.recommendedMaximum < policy.recommendedMinimum) {
    throw validationError(
      'Recommended maximum cannot be lower than the recommended minimum.',
    )
  }
  if (
    policy.maximumAllowed !== null &&
    (!Number.isInteger(policy.maximumAllowed) ||
      policy.maximumAllowed < policy.recommendedMaximum)
  ) {
    throw validationError(
      'Maximum allowed must be at least the recommended maximum, or left empty.',
    )
  }
}

export function validateCycleStagesConfig(config) {
  if (!config?.goals?.employee) {
    throw validationError('Goal setting requires a start and end date.')
  }
  if (!config?.performance?.employeeStart || !config?.performance?.managerStart) {
    throw validationError('Cycle stages are incomplete. Reload and try again.')
  }

  const enabled = new Map(
    (config.reviewStages ?? []).map((stage) => [stage.id, stage.enabled]),
  )
  const goalsOn = enabled.get('goals') !== false
  const reviewOn =
    enabled.get('self_review') === true || enabled.get('manager_review') !== false

  const ranges = []
  if (goalsOn) {
    ranges.push([
      'Goal setting',
      config.goals.employee.startDate,
      config.goals.employee.endDate,
    ])
  }
  if (enabled.get('self_review')) {
    ranges.push([
      'Self-review',
      config.performance.employeeStart.date,
      config.performance.employeeEnd.date,
    ])
  }
  if (enabled.get('manager_review') !== false) {
    ranges.push([
      'Manager review',
      config.performance.managerStart.date,
      config.performance.managerEnd.date,
    ])
  }

  for (const [label, startDate, endDate] of ranges) {
    if (!startDate || !endDate) {
      throw validationError(`${label} requires a start and end date.`)
    }
    if (startDate > endDate) {
      throw validationError(`${label} must end on or after its start date.`)
    }
  }

  if (goalsOn && reviewOn && config.goals.employee.endDate >= config.performance.employeeStart.date) {
    throw validationError(
      'Performance review must start after the employee goal lock date.',
    )
  }

  for (const extension of config.goals.extensions ?? []) {
    if (
      !extension.endDate ||
      extension.endDate <= config.goals.employee.endDate
    ) {
      throw validationError(
        'An extension deadline must be after the standard goal deadline.',
      )
    }
    if (extension.endDate >= config.performance.employeeStart.date) {
      throw validationError(
        'An extension deadline must be before performance review starts.',
      )
    }

    const scope = extension.scope
    const validDepartment =
      scope?.type === 'department' &&
      Number.isInteger(scope.departmentId) &&
      Boolean(scope.departmentName?.trim())
    const validTeam =
      scope?.type === 'team' &&
      Number.isInteger(scope.teamId) &&
      Boolean(scope.teamName?.trim())
    const validPeople =
      scope?.type === 'people' &&
      Array.isArray(scope.employeeIds) &&
      scope.employeeIds.length > 0 &&
      scope.employeeIds.every(Number.isInteger)
    if (!validDepartment && !validTeam && !validPeople) {
      throw validationError(
        'Each extension requires a valid team, department, or people selection.',
      )
    }
  }
}

export function validateCalibration(calibration) {
  const bands = Object.values(calibration.gradeDistribution ?? {})
  if (
    bands.some((value) => !Number.isInteger(value) || value < 0 || value > 100)
  ) {
    throw validationError(
      'Grade distribution values must be whole percentages from 0 to 100.',
    )
  }
  const total = bands.reduce((sum, value) => sum + value, 0)
  if (total !== 100) {
    throw validationError('Grade distribution must total 100%.')
  }
}

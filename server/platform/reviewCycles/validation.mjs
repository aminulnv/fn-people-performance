/** Shared cycle validation helpers for the platform API. */

import {
  applyNestedWindowsToReviewStages,
  defaultReviewStages,
  deriveReviewStagesFromLegacy,
  inferPurpose,
  mergeReviewStages,
  syncLegacyStageWindows,
} from './reviewConfig.mjs'

function datePart(value) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? ''))
  return match?.[1] ?? ''
}

function dateTimeSortKey(value) {
  if (value && typeof value === 'object') {
    const date = datePart(value.date)
    const time = /^\d{2}:\d{2}$/.test(value.time ?? '') ? value.time : '00:00'
    return date ? `${date}T${time}` : ''
  }
  const raw = String(value ?? '')
  const datetime = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(raw)
  if (datetime) return `${datetime[1]}T${datetime[2]}`
  const date = datePart(raw)
  return date ? `${date}T00:00` : ''
}

function parseIso(iso) {
  const [y, m, d] = datePart(iso).split('-').map(Number)
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

function integerId(value) {
  if (value == null || String(value).trim() === '') return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : undefined
}

function normalizeGoalExtensions(extensions) {
  return (extensions ?? []).map((extension) => {
    const scope = extension.scope
    if (scope?.type === 'department') {
      return {
        ...extension,
        scope: {
          ...scope,
          departmentId: integerId(scope.departmentId) ?? scope.departmentId,
        },
      }
    }
    if (scope?.type === 'team') {
      return {
        ...extension,
        scope: {
          ...scope,
          teamId: integerId(scope.teamId) ?? scope.teamId,
        },
      }
    }
    if (scope?.type === 'people') {
      return {
        ...extension,
        scope: {
          ...scope,
          employeeIds: (scope.employeeIds ?? [])
            .map((id) => integerId(id))
            .filter((id) => id != null),
        },
      }
    }
    return extension
  })
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
  const purpose =
    quarter.purpose ??
    inferPurpose(
      quarter.periodKey,
      quarter.type === 'custom' || quarter.type === 'ad-hoc'
        ? 'custom'
        : 'quarterly_checkin',
    )
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
      extensions: normalizeGoalExtensions(config.goals?.extensions),
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

const EXTRA_STAGE_LABELS = {
  calibration_hod_hrbp: 'HOD / HRBP calibration',
  calibration_slt: 'SLT calibration',
  appeal: 'Appeal',
}

export function validateCycleDateRange(startDate, endDate) {
  if (!dateTimeSortKey(startDate) || !dateTimeSortKey(endDate)) {
    throw validationError('Cycle requires a start and end date.')
  }
  if (dateTimeSortKey(startDate) > dateTimeSortKey(endDate)) {
    throw validationError('Cycle must end on or after its start date.')
  }
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
  const hasStages = (config.reviewStages ?? []).length > 0
  const goalsOn = hasStages ? enabled.get('goals') === true : true
  const selfOn = enabled.get('self_review') === true
  const managerOn = hasStages ? enabled.get('manager_review') === true : true
  const reviewOn = selfOn || managerOn

  const ranges = []
  if (goalsOn) {
    ranges.push([
      'Goal setting',
      config.goals.employee.startDate,
      config.goals.employee.endDate,
    ])
  }
  if (selfOn) {
    ranges.push([
      'Self-review',
      config.performance.employeeStart.date,
      config.performance.employeeEnd.date,
    ])
  }
  if (managerOn) {
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
    if (dateTimeSortKey(startDate) > dateTimeSortKey(endDate)) {
      throw validationError(`${label} must end on or after its start date.`)
    }
  }

  for (const stage of config.reviewStages ?? []) {
    if (
      !stage.enabled ||
      stage.id === 'publish_managers' ||
      stage.id === 'publish_employees' ||
      stage.id === 'goals' ||
      stage.id === 'self_review' ||
      stage.id === 'manager_review' ||
      !stage.start ||
      !stage.end
    ) {
      continue
    }
    const label = EXTRA_STAGE_LABELS[stage.id] ?? stage.id
    if (dateTimeSortKey(stage.start) > dateTimeSortKey(stage.end)) {
      throw validationError(`${label} must end on or after its start date.`)
    }
  }

  if (goalsOn && reviewOn && datePart(config.goals.employee.endDate) >= datePart(config.performance.employeeStart.date)) {
    throw validationError(
      'Performance review must start after the employee goal lock date.',
    )
  }

  for (const extension of config.goals.extensions ?? []) {
    if (
      !extension.endDate ||
      dateTimeSortKey(extension.endDate) <= dateTimeSortKey(config.goals.employee.endDate)
    ) {
      throw validationError(
        'An extension deadline must be after the standard goal deadline.',
      )
    }
    if (datePart(extension.endDate) >= datePart(config.performance.employeeStart?.date ?? config.performance.employeeStart)) {
      throw validationError(
        'An extension deadline must be before performance review starts.',
      )
    }

    const scope = extension.scope
    const validDepartment =
      scope?.type === 'department' &&
      Number.isInteger(Number(scope.departmentId)) &&
      String(scope.departmentId).trim() !== '' &&
      Boolean(scope.departmentName?.trim())
    const validTeam =
      scope?.type === 'team' &&
      Number.isInteger(Number(scope.teamId)) &&
      String(scope.teamId).trim() !== '' &&
      Boolean(scope.teamName?.trim())
    const validPeople =
      scope?.type === 'people' &&
      Array.isArray(scope.employeeIds) &&
      scope.employeeIds.length > 0 &&
      scope.employeeIds.every(
        (id) => Number.isInteger(Number(id)) && String(id).trim() !== '',
      )
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

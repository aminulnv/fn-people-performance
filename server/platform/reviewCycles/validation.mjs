/** Shared Review Cycle validation helpers for the platform API. */

export function validateGoalCountPolicy(policy) {
  const values = [
    policy.minimumRequired,
    policy.recommendedMinimum,
    policy.recommendedMaximum,
  ]
  if (values.some((value) => !Number.isInteger(value) || value < 1)) {
    const err = new Error(
      'Goal-count values must be whole numbers greater than zero.',
    )
    err.statusCode = 400
    throw err
  }
  if (policy.recommendedMinimum < policy.minimumRequired) {
    const err = new Error(
      'Recommended minimum cannot be lower than the required minimum.',
    )
    err.statusCode = 400
    throw err
  }
  if (policy.recommendedMaximum < policy.recommendedMinimum) {
    const err = new Error(
      'Recommended maximum cannot be lower than the recommended minimum.',
    )
    err.statusCode = 400
    throw err
  }
  if (
    policy.maximumAllowed !== null &&
    (!Number.isInteger(policy.maximumAllowed) ||
      policy.maximumAllowed < policy.recommendedMaximum)
  ) {
    const err = new Error(
      'Maximum allowed must be at least the recommended maximum, or left empty.',
    )
    err.statusCode = 400
    throw err
  }
}

export function validateCycleStagesConfig(config) {
  const ranges = [
    [
      'Department goals',
      config.goals.department.startDate,
      config.goals.department.endDate,
    ],
    ['Team goals', config.goals.team.startDate, config.goals.team.endDate],
    [
      'Employee goals',
      config.goals.employee.startDate,
      config.goals.employee.endDate,
    ],
    [
      'Employee performance',
      config.performance.employeeStart.date,
      config.performance.employeeEnd.date,
    ],
    [
      'Manager performance',
      config.performance.managerStart.date,
      config.performance.managerEnd.date,
    ],
  ]

  for (const [label, startDate, endDate] of ranges) {
    if (!startDate || !endDate) {
      const err = new Error(`${label} requires a start and end date.`)
      err.statusCode = 400
      throw err
    }
    if (startDate > endDate) {
      const err = new Error(`${label} must end on or after its start date.`)
      err.statusCode = 400
      throw err
    }
  }

  if (config.goals.employee.endDate >= config.performance.employeeStart.date) {
    const err = new Error(
      'Employee performance must start after the employee goal lock date.',
    )
    err.statusCode = 400
    throw err
  }
}

export function validateCalibration(calibration) {
  const bands = Object.values(calibration.gradeDistribution ?? {})
  if (
    bands.some((value) => !Number.isInteger(value) || value < 0 || value > 100)
  ) {
    const err = new Error(
      'Grade distribution values must be whole percentages from 0 to 100.',
    )
    err.statusCode = 400
    throw err
  }
  const total = bands.reduce((sum, value) => sum + value, 0)
  if (total !== 100) {
    const err = new Error('Grade distribution must total 100%.')
    err.statusCode = 400
    throw err
  }
}

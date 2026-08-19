import { HttpError } from '../../errors.mjs'

function sumWeights(items) {
  return items.reduce((sum, item) => sum + (Number(item?.weight) || 0), 0)
}

function measureNamesComplete(measurements) {
  if (!Array.isArray(measurements) || measurements.length === 0) return true
  const seenGroups = new Set()
  for (const measurement of measurements) {
    if (measurement?.kind === 'metric') {
      if (!String(measurement.title ?? '').trim()) return false
      continue
    }
    if (measurement?.kind === 'milestone') {
      const groupId = measurement.measureGroupId ?? measurement.id
      if (seenGroups.has(groupId)) continue
      seenGroups.add(groupId)
      if (!String(measurement.measureTitle ?? '').trim()) return false
    }
  }
  return true
}

function goalName(goal, index) {
  const description =
    typeof goal?.description === 'string' ? goal.description.trim() : ''
  return description || `Untitled goal ${index + 1}`
}

/**
 * Submission rules shared conceptually with src/lib/goals/weightage.ts.
 * Drafts remain permissive; this validation runs only at submission time.
 */
export function validateGoalSubmission(goals, policy) {
  const errors = []
  if (!Array.isArray(goals)) return ['Goals must be provided as a list.']

  const minimumRequired = Number(policy?.minimumRequired)
  const maximumAllowed =
    policy?.maximumAllowed == null ? null : Number(policy.maximumAllowed)

  if (!Number.isInteger(minimumRequired) || minimumRequired < 1) {
    throw new HttpError(500, 'The cycle goal-count policy is invalid.')
  }

  if (goals.length < minimumRequired) {
    errors.push(
      `Add at least ${minimumRequired} ${
        minimumRequired === 1 ? 'goal' : 'goals'
      }.`,
    )
  }
  if (
    maximumAllowed !== null &&
    Number.isInteger(maximumAllowed) &&
    goals.length > maximumAllowed
  ) {
    errors.push(`This cycle allows no more than ${maximumAllowed} goals.`)
  }
  if (sumWeights(goals) !== 100) {
    errors.push('Goal weights need to add up to 100%.')
  }

  goals.forEach((goal, index) => {
    const name = goalName(goal, index)
    if (
      typeof goal?.description !== 'string' ||
      !goal.description.trim()
    ) {
      errors.push(`${name} needs a title.`)
    }

    const measurements = Array.isArray(goal?.measurements)
      ? goal.measurements
      : []
    if (measurements.length === 0) {
      errors.push(`${name} still needs a measure.`)
    } else if (!measureNamesComplete(measurements)) {
      errors.push(`${name} still needs a name on each measure.`)
    } else if (sumWeights(measurements) !== 100) {
      errors.push(`${name} measures need to add up to 100%.`)
    }
  })

  return errors
}

export function assertGoalSubmission(goals, policy) {
  const errors = validateGoalSubmission(goals, policy)
  if (errors.length > 0) {
    throw new HttpError(400, `Goals cannot be submitted: ${errors.join(' ')}`)
  }
}

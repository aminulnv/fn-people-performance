import { HttpError } from '../../errors.mjs'

const GOAL_TYPES = new Set(['outcome', 'output'])
const PROCESS_TYPES = new Set(['okr', 'bau', 'pi'])
const PRIORITIES = new Set(['high', 'medium', 'low'])

function sumWeights(items) {
  return items.reduce((sum, item) => sum + (Number(item?.weight) || 0), 0)
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
    if (
      !GOAL_TYPES.has(goal?.goalType) ||
      !PROCESS_TYPES.has(goal?.processType) ||
      !PRIORITIES.has(goal?.priority)
    ) {
      errors.push(`${name} needs a valid type, process type, and priority.`)
    }

    const measurements = Array.isArray(goal?.measurements)
      ? goal.measurements
      : []
    if (measurements.length === 0) {
      errors.push(`${name} still needs a measure.`)
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

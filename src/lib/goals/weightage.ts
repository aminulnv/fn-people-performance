import { normalizeMetricStrategy } from './measurements'
import type { GoalCountPolicy } from '@/lib/reviews/types'
import type { Goal, Measurement } from './types'

export function sumGoalWeights(goals: Goal[]): number {
  return goals.reduce((sum, g) => sum + (Number(g.weight) || 0), 0)
}

export function sumMeasurementWeights(measurements: Measurement[]): number {
  return measurements.reduce((sum, m) => sum + (Number(m.weight) || 0), 0)
}

export type SubmitGoalBlocker = {
  reason: string
  goalId?: string
  goalTitle?: string
  suffix?: string
}

export function goalCountWarning(
  goalCount: number,
  policy: GoalCountPolicy,
): string | null {
  if (goalCount < policy.recommendedMinimum) {
    return `You have ${goalCount} goals. This cycle recommends ${policy.recommendedMinimum} to ${policy.recommendedMaximum} goals for a balanced cycle.`
  }
  if (goalCount > policy.recommendedMaximum) {
    return `You have ${goalCount} goals. This cycle recommends keeping the focus on ${policy.recommendedMinimum} to ${policy.recommendedMaximum} goals.`
  }
  return null
}

function goalName(goal: Goal, index: number): string {
  return goal.description.trim() || `Untitled goal ${index + 1}`
}

function goalBlocker(
  goal: Goal,
  index: number,
  suffix: string,
): SubmitGoalBlocker {
  const goalTitle = goalName(goal, index)
  return {
    reason: `${goalTitle}${suffix}`,
    goalId: goal.id,
    goalTitle,
    suffix,
  }
}

export function canSubmitGoals(
  goals: Goal[],
  policy: GoalCountPolicy,
): {
  ok: boolean
  reasons: string[]
  blockers: SubmitGoalBlocker[]
  warning: string | null
} {
  const blockers: SubmitGoalBlocker[] = []
  if (goals.length < policy.minimumRequired) {
    blockers.push({
      reason: `Add at least ${policy.minimumRequired} ${policy.minimumRequired === 1 ? 'goal' : 'goals'}.`,
    })
  }
  if (policy.maximumAllowed !== null && goals.length > policy.maximumAllowed) {
    blockers.push({
      reason: `This cycle allows no more than ${policy.maximumAllowed} goals.`,
    })
  }
  if (sumGoalWeights(goals) !== 100) {
    blockers.push({ reason: 'Weights need to add up to 100%.' })
  }
  goals.some((goal, index) => {
    if (!goal.description.trim()) {
      blockers.push(goalBlocker(goal, index, ' needs a title.'))
      return true
    }
    if (!goal.goalType || !goal.processType || !goal.priority) {
      blockers.push(
        goalBlocker(goal, index, ' needs a type, process type, and priority.'),
      )
      return true
    }
    if (goal.measurements.length < 1) {
      blockers.push(
        goalBlocker(
          goal,
          index,
          goal.cascadedFromGoalId
            ? ' still needs a measure — or remove it.'
            : ' still needs a measure.',
        ),
      )
      return true
    }
    if (sumMeasurementWeights(goal.measurements) !== 100) {
      blockers.push(
        goalBlocker(goal, index, ' measures need to add up to 100%.'),
      )
      return true
    }
    return false
  })
  return {
    ok: blockers.length === 0,
    reasons: blockers.map((blocker) => blocker.reason),
    blockers,
    warning: goalCountWarning(goals.length, policy),
  }
}

export function measurementProgress(m: Measurement): number {
  if (m.kind === 'milestone') return m.complete ? 100 : 0

  const strategy = normalizeMetricStrategy(m.direction)

  const startValue = m.startValue ?? 0
  const targetValue = m.targetValue ?? 0
  const currentValue = m.currentValue ?? 0

  if (strategy === 'decrease') {
    if (startValue === targetValue) {
      return currentValue <= targetValue ? 100 : 0
    }
    const span = startValue - targetValue
    if (span <= 0) return 0
    return Math.max(
      0,
      Math.min(100, ((startValue - currentValue) / span) * 100),
    )
  }

  if (strategy === 'between') {
    const min = m.rangeMin ?? Math.min(startValue, targetValue)
    const max = m.rangeMax ?? Math.max(startValue, targetValue)
    return currentValue >= min && currentValue <= max ? 100 : 0
  }

  if (strategy === 'keep_above') {
    const threshold = m.rangeMin ?? targetValue
    return currentValue >= threshold ? 100 : 0
  }

  if (strategy === 'keep_below') {
    const threshold = m.rangeMax ?? targetValue
    return currentValue <= threshold ? 100 : 0
  }

  // increase (and legacy greater_than)
  const span = targetValue - startValue
  if (span <= 0) return currentValue >= targetValue ? 100 : 0
  return Math.max(0, Math.min(100, ((currentValue - startValue) / span) * 100))
}

export function goalCompletion(goal: Goal): number {
  if (goal.measurements.length === 0) return 0
  const total = sumMeasurementWeights(goal.measurements) || 100
  return goal.measurements.reduce((sum, m) => {
    return sum + (measurementProgress(m) * m.weight) / total
  }, 0)
}

export function overallCompletion(goals: Goal[]): number {
  if (goals.length === 0) return 0
  const total = sumGoalWeights(goals) || 100
  return goals.reduce(
    (sum, g) => sum + (goalCompletion(g) * g.weight) / total,
    0,
  )
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

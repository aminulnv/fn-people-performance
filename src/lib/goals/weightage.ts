import { normalizeMetricStrategy } from './measurements'
import type { Goal, Measurement } from './types'

export function sumGoalWeights(goals: Goal[]): number {
  return goals.reduce((sum, g) => sum + (Number(g.weight) || 0), 0)
}

export function sumMeasurementWeights(measurements: Measurement[]): number {
  return measurements.reduce((sum, m) => sum + (Number(m.weight) || 0), 0)
}

export function canSubmitGoals(goals: Goal[]): {
  ok: boolean
  reasons: string[]
} {
  const reasons: string[] = []
  if (goals.length < 2) reasons.push('Add at least 2 goals.')
  if (sumGoalWeights(goals) !== 100) {
    reasons.push('Goal weights must add up to 100%.')
  }
  for (const goal of goals) {
    if (!goal.description.trim()) {
      reasons.push('Every goal needs a description.')
      break
    }
    if (goal.measurements.length < 1) {
      reasons.push('Every goal needs at least 1 measurement.')
      break
    }
    if (sumMeasurementWeights(goal.measurements) !== 100) {
      reasons.push(
        `“${goal.description.slice(0, 32) || 'A goal'}…” measurements must total 100%.`,
      )
      break
    }
  }
  return { ok: reasons.length === 0, reasons }
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
  return Math.max(
    0,
    Math.min(100, ((currentValue - startValue) / span) * 100),
  )
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

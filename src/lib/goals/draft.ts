import type { Goal } from './types'
import { sumMeasurementWeights } from './weightage'

export type GoalDraftValidation = {
  ok: boolean
  nameError?: string
  measurementWeightError?: string
}

export function validateGoalDraft(goal: Goal): GoalDraftValidation {
  const nameError = goal.description.trim()
    ? undefined
    : 'Goal name is required'
  const measureWeight = sumMeasurementWeights(goal.measurements)
  const measurementWeightError =
    goal.measurements.length === 0
      ? 'Add at least one measurement'
      : measureWeight === 100
        ? undefined
        : 'Measurement weights must total 100%'

  return {
    ok: !nameError && !measurementWeightError,
    nameError,
    measurementWeightError,
  }
}

/** Compare editable goal fields — ignores comment-only / timestamp noise. */
export function isGoalDraftDirty(baseline: Goal, draft: Goal): boolean {
  const strip = (goal: Goal) => ({
    description: goal.description,
    weight: goal.weight,
    ownerId: goal.ownerId,
    details: goal.details ?? '',
    cascadedFromGoalId: goal.cascadedFromGoalId ?? '',
    linkedGoalLabel: goal.linkedGoalLabel ?? '',
    progressStatus: goal.progressStatus,
    measurements: goal.measurements.map((item) => {
      if (item.kind === 'milestone') {
        return {
          id: item.id,
          kind: item.kind,
          title: item.title,
          weight: item.weight,
          complete: item.complete,
        }
      }
      return {
        id: item.id,
        kind: item.kind,
        title: item.title,
        weight: item.weight,
        unit: item.unit,
        direction: item.direction,
        startValue: item.startValue,
        targetValue: item.targetValue,
        currentValue: item.currentValue,
        rangeMin: item.rangeMin,
        rangeMax: item.rangeMax,
      }
    }),
  })
  return JSON.stringify(strip(baseline)) !== JSON.stringify(strip(draft))
}

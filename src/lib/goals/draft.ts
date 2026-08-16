import type { Goal } from './types'
import { sumMeasurementWeights } from './weightage'

export type GoalDraftValidation = {
  ok: boolean
  nameError?: string
  classificationError?: string
  measurementWeightError?: string
}

export function validateGoalDraft(goal: Goal): GoalDraftValidation {
  const nameError = goal.description.trim()
    ? undefined
    : 'Goal name is required'
  const classificationError =
    goal.goalType && goal.processType && goal.priority
      ? undefined
      : 'Goal type, process type, and priority are required'
  const measureWeight = sumMeasurementWeights(goal.measurements)
  const measurementWeightError =
    goal.measurements.length === 0
      ? 'Add at least one measurement'
      : measureWeight === 100
        ? undefined
        : 'Measurement weights must total 100%'

  return {
    ok: !nameError && !classificationError && !measurementWeightError,
    nameError,
    classificationError,
    measurementWeightError,
  }
}

/** Compare editable goal fields — ignores comment-only / timestamp noise. */
export function isGoalDraftDirty(baseline: Goal, draft: Goal): boolean {
  const strip = (goal: Goal) => ({
    description: goal.description,
    weight: goal.weight,
    goalType: goal.goalType,
    processType: goal.processType,
    priority: goal.priority,
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

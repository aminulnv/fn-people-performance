import type { Goal, Measurement } from './types'

function structuralMeasurement(measurement: Measurement) {
  if (measurement.kind === 'milestone') {
    return {
      id: measurement.id,
      kind: measurement.kind,
      title: measurement.title,
      weight: measurement.weight,
      proofUrl: measurement.proofUrl,
      comment: measurement.comment,
    }
  }

  return {
    id: measurement.id,
    kind: measurement.kind,
    title: measurement.title,
    weight: measurement.weight,
    unit: measurement.unit,
    direction: measurement.direction,
    startValue: measurement.startValue,
    targetValue: measurement.targetValue,
    rangeMin: measurement.rangeMin,
    rangeMax: measurement.rangeMax,
    proofUrl: measurement.proofUrl,
    comment: measurement.comment,
  }
}

function structuralGoal(goal: Goal) {
  return {
    id: goal.id,
    description: goal.description,
    weight: goal.weight,
    goalType: goal.goalType,
    processType: goal.processType,
    priority: goal.priority,
    ownerId: goal.ownerId,
    details: goal.details,
    cascadedFromGoalId: goal.cascadedFromGoalId,
    linkedGoalLabel: goal.linkedGoalLabel,
    measurements: goal.measurements.map(structuralMeasurement),
  }
}

/**
 * Progress can change without another approval. Everything else—including
 * adding, removing, or reordering goals and measurements—is structural.
 */
export function hasStructuralGoalChanges(
  currentGoals: Goal[],
  nextGoals: Goal[],
): boolean {
  return (
    JSON.stringify(currentGoals.map(structuralGoal)) !==
    JSON.stringify(nextGoals.map(structuralGoal))
  )
}

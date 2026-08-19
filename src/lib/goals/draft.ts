import type { Goal, Measurement, Milestone } from './types'
import { coalesceMeasureGroups, measurementPanels, hasMeasurePanelName } from './measurements'
import { sumMeasurementWeights } from './weightage'

function preferLocalText(
  local: string | undefined,
  persisted: string | undefined,
): string | undefined {
  if (local !== undefined && local !== persisted) return local
  const persistedText = persisted?.trim() ?? ''
  return persistedText || local
}

function mergeMeasurement(
  local: Measurement[],
  persisted: Measurement,
): Measurement {
  if (persisted.kind !== 'milestone') return persisted
  const localItem = local.find(
    (item): item is Milestone =>
      item.kind === 'milestone' && item.id === persisted.id,
  )
  if (!localItem) return persisted
  return {
    ...persisted,
    measureGroupId: localItem.measureGroupId ?? persisted.measureGroupId,
    measureTitle: preferLocalText(
      localItem.measureTitle,
      persisted.measureTitle,
    ),
    listId: localItem.listId ?? persisted.listId,
    listTitle: preferLocalText(localItem.listTitle, persisted.listTitle),
    title: preferLocalText(localItem.title, persisted.title) ?? '',
  }
}

function mergeGoalMeasurements(
  local: Measurement[],
  persisted: Measurement[],
): Measurement[] {
  const persistedById = new Map(persisted.map((item) => [item.id, item]))
  const merged: Measurement[] = []

  for (const localItem of local) {
    const persistedItem = persistedById.get(localItem.id)
    if (persistedItem) {
      merged.push(mergeMeasurement(local, persistedItem))
    } else {
      // New row added locally — keep it until the next save lands.
      merged.push(localItem)
    }
    persistedById.delete(localItem.id)
  }

  for (const orphaned of persistedById.values()) {
    merged.push(orphaned)
  }

  return merged
}

/** Merge server goals into local draft state without dropping in-flight edits. */
export function mergePersistedGoals(current: Goal[], persisted: Goal[]): Goal[] {
  return persisted.map((persistedGoal) => {
    const localGoal = current.find((goal) => goal.id === persistedGoal.id)
    if (!localGoal) return persistedGoal
    return {
      ...persistedGoal,
      measurements: coalesceMeasureGroups(
        mergeGoalMeasurements(localGoal.measurements, persistedGoal.measurements),
      ),
    }
  })
}

export function goalDraftSnapshot(goal: Goal) {
  return {
    description: goal.description,
    weight: goal.weight,
    ownerId: goal.ownerId,
    details: goal.details ?? '',
    cascadedFromGoalId: goal.cascadedFromGoalId ?? '',
    linkedGoalLabel: goal.linkedGoalLabel ?? '',
    measurements: goal.measurements.map((item) => {
      if (item.kind === 'milestone') {
        return {
          id: item.id,
          kind: item.kind,
          measureGroupId: item.measureGroupId,
          listTitle: item.listTitle,
          measureTitle: item.measureTitle,
          listId: item.listId,
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
  }
}

export function serializeGoalsDraft(goals: Goal[]): string {
  return JSON.stringify(goals.map((goal) => goalDraftSnapshot(goal)))
}

export type GoalDraftValidation = {
  ok: boolean
  nameError?: string
  measurementNameError?: string
  measurementWeightError?: string
}

export function validateGoalDraft(goal: Goal): GoalDraftValidation {
  const nameError = goal.description.trim()
    ? undefined
    : 'Goal name is required'
  const measureWeight = sumMeasurementWeights(goal.measurements)
  const measurementNameError =
    goal.measurements.length === 0
      ? undefined
      : measurementPanels(goal.measurements).some((panel) => !hasMeasurePanelName(panel))
        ? 'Each measure needs a name'
        : undefined
  const measurementWeightError =
    goal.measurements.length === 0
      ? 'Add at least one measurement'
      : measureWeight === 100
        ? undefined
        : 'Measurement weights must total 100%'

  return {
    ok: !nameError && !measurementNameError && !measurementWeightError,
    nameError,
    measurementNameError,
    measurementWeightError,
  }
}

/** Compare editable goal fields — ignores comment-only / timestamp noise. */
export function isGoalDraftDirty(baseline: Goal, draft: Goal): boolean {
  return (
    JSON.stringify(goalDraftSnapshot(baseline)) !==
    JSON.stringify(goalDraftSnapshot(draft))
  )
}

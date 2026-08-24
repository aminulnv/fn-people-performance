import type { Goal, Measurement } from './types'
import { coalesceMeasureGroups, measurementPanels, hasMeasurePanelName } from './measurements'
import {
  isBlankGoalTitle,
  isEvenGoalSplit,
  sumMeasurementWeights,
} from './weightage'

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
  const localItem = local.find((item) => item.id === persisted.id)
  if (!localItem) return persisted
  if (persisted.kind === 'metric' && localItem.kind === 'metric') {
    return {
      ...persisted,
      title: preferLocalText(localItem.title, persisted.title) ?? '',
      weight: localItem.weight,
      unit: localItem.unit,
      direction: localItem.direction,
      startValue: localItem.startValue,
      targetValue: localItem.targetValue,
      currentValue: localItem.currentValue,
      rangeMin: localItem.rangeMin,
      rangeMax: localItem.rangeMax,
    }
  }
  if (persisted.kind !== 'milestone' || localItem.kind !== 'milestone') {
    return persisted
  }
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
    weight: localItem.weight,
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
    const measurements = coalesceMeasureGroups(
      mergeGoalMeasurements(localGoal.measurements, persistedGoal.measurements),
    )
    if (!isGoalDraftDirty(persistedGoal, localGoal)) {
      return { ...persistedGoal, measurements }
    }
    return {
      ...persistedGoal,
      description: localGoal.description,
      weight: localGoal.weight,
      ownerId: localGoal.ownerId,
      details: localGoal.details,
      cascadedFromGoalId: localGoal.cascadedFromGoalId,
      linkedGoalLabel: localGoal.linkedGoalLabel,
      measurements,
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
  const nameError = isBlankGoalTitle(goal) ? 'Goal name is required' : undefined
  const measureWeight = sumMeasurementWeights(goal.measurements)
  const measurementNameError =
    goal.measurements.length === 0
      ? undefined
      : measurementPanels(goal.measurements).some((panel) => !hasMeasurePanelName(panel))
        ? 'Each metric needs a name'
        : undefined
  const measurementWeightError =
    goal.measurements.length === 0
      ? 'Add at least one metric'
      : measureWeight === 100
        ? undefined
        : 'Metric weights must total 100%'

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

/** A newly opened create form with no user-entered content yet. */
export function isBlankGoalDraft(goal: Goal): boolean {
  return (
    !goal.description.trim() &&
    !(goal.details ?? '').trim() &&
    !goal.cascadedFromGoalId &&
    !goal.linkedGoalLabel &&
    goal.measurements.length === 0
  )
}

function isWeightOnlyDirty(baseline: Goal, draft: Goal): boolean {
  return (
    isGoalDraftDirty(baseline, draft) &&
    !isGoalDraftDirty({ ...baseline, weight: draft.weight }, draft)
  )
}

/**
 * True when closing the goal panel should ask to save as draft or discard.
 * A blank new goal is not promptable so Add Goal → immediate close stays quiet.
 */
export function hasPromptableUnsavedGoalDraft(
  goals: Goal[],
  persistedGoals: Goal[],
): boolean {
  const persistedById = new Map(persistedGoals.map((goal) => [goal.id, goal]))
  const localById = new Map(goals.map((goal) => [goal.id, goal]))

  const hasBlankCreate = goals.some(
    (goal) => !persistedById.has(goal.id) && isBlankGoalDraft(goal),
  )
  const autoSplitWhileCreating = hasBlankCreate && isEvenGoalSplit(goals)

  for (const persisted of persistedGoals) {
    const local = localById.get(persisted.id)
    if (!local) return true
    if (!isGoalDraftDirty(persisted, local)) continue
    if (autoSplitWhileCreating && isWeightOnlyDirty(persisted, local)) continue
    return true
  }

  return goals.some(
    (goal) => !persistedById.has(goal.id) && !isBlankGoalDraft(goal),
  )
}

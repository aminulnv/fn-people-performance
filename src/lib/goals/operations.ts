import { blankGoal } from './measurements'
import { newId } from './weightage'
import type { DemoPerson, Goal, GoalsSnapshot, Measurement } from './types'

export type GoalOwnerOption = {
  id: string
  name: string
  title?: string
  avatarUrl?: string
}

export type ResolvedGoalOwner = {
  id: string
  name: string
  title?: string
  avatarUrl?: string
}

export function buildOwnerOptions(people: DemoPerson[]): GoalOwnerOption[] {
  return people
    .map((person) => ({
      id: person.id,
      name: person.name,
      title: person.title,
      avatarUrl: person.avatarUrl,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export type CascadeGoalOption = {
  id: string
  title: string
  managerName: string
  managerId?: string
  managerAvatarUrl?: string
}

export type LineManagerCascade = {
  managerId?: string | null
  managerName: string | null
  managerAvatarUrl?: string
  /** Manager's manager — used when a late submission needs skip-level approval. */
  skipLevelManagerId?: string | null
  skipLevelManagerName?: string | null
  skipLevelManagerAvatarUrl?: string
  options: CascadeGoalOption[]
}

const EMPTY_CASCADE: LineManagerCascade = { managerName: null, options: [] }

function cascadeGoalTitle(goal: Goal, index: number): string {
  return goal.description.trim() || `Untitled goal ${index + 1}`
}

/** Goals of the subject's line manager only — one level up the tree. */
export function lineManagerCascade(
  subject: DemoPerson | null,
  snapshot: Pick<GoalsSnapshot, 'people' | 'byPerson'> | null,
): LineManagerCascade {
  if (!subject?.managerId || !snapshot) return EMPTY_CASCADE
  const manager = snapshot.people.find((person) => person.id === subject.managerId)
  if (!manager) return EMPTY_CASCADE
  const skipLevel = manager.managerId
    ? snapshot.people.find((person) => person.id === manager.managerId)
    : null
  const goals = snapshot.byPerson[manager.id]?.goals ?? []
  return {
    managerId: manager.id,
    managerName: manager.name,
    managerAvatarUrl: manager.avatarUrl,
    skipLevelManagerId: skipLevel?.id ?? null,
    skipLevelManagerName: skipLevel?.name ?? null,
    skipLevelManagerAvatarUrl: skipLevel?.avatarUrl,
    options: goals.map((goal, index) => ({
      id: goal.id,
      title: cascadeGoalTitle(goal, index),
      managerName: manager.name,
      managerId: manager.id,
      managerAvatarUrl: manager.avatarUrl,
    })),
  }
}

export function selectedCascadeOption(
  goal: Pick<Goal, 'cascadedFromGoalId' | 'linkedGoalLabel'>,
  options: CascadeGoalOption[],
): CascadeGoalOption | null {
  if (goal.cascadedFromGoalId) {
    const match = options.find((option) => option.id === goal.cascadedFromGoalId)
    if (match) return match
  }
  const label = goal.linkedGoalLabel?.trim()
  if (!label) return null
  return (
    options.find((option) => option.title === label) ?? {
      id: goal.cascadedFromGoalId ?? '',
      title: label,
      managerName: '',
    }
  )
}

export function applyCascadeSelection(
  option: CascadeGoalOption | null,
): Pick<Goal, 'cascadedFromGoalId' | 'linkedGoalLabel'> {
  if (!option) {
    return { cascadedFromGoalId: undefined, linkedGoalLabel: undefined }
  }
  return {
    cascadedFromGoalId: option.id || undefined,
    linkedGoalLabel: option.title,
  }
}

export type CascadeRecipient = {
  goalId: string
  goalTitle: string
  personId: string
  personName: string
  avatarUrl?: string
}

/** Child goals already cascaded from this one — live title + owner. */
export function cascadeRecipients(
  sourceGoalId: string,
  snapshot: Pick<GoalsSnapshot, 'people' | 'byPerson'> | null,
): CascadeRecipient[] {
  if (!snapshot || !sourceGoalId) return []
  return snapshot.people.flatMap((person) => {
    const row = snapshot.byPerson[person.id]
    if (!row) return []
    return row.goals.flatMap((goal, index) => {
      if (goal.cascadedFromGoalId !== sourceGoalId) return []
      return [
        {
          goalId: goal.id,
          goalTitle: cascadeGoalTitle(goal, index),
          personId: person.id,
          personName: person.name,
          avatarUrl: person.avatarUrl,
        },
      ]
    })
  })
}

/** Prefer the goal's ownerId; fall back to the subject's bucket owner. */
export function resolveGoalOwner(
  goal: Goal,
  subject: DemoPerson,
  people: DemoPerson[],
): ResolvedGoalOwner {
  const ownerId = goal.ownerId ?? subject.id
  const match = people.find((person) => person.id === ownerId)
  if (match) {
    return {
      id: match.id,
      name: match.name,
      title: match.title,
      avatarUrl: match.avatarUrl,
    }
  }
  if (ownerId === subject.id) {
    return {
      id: subject.id,
      name: subject.name,
      title: subject.title,
      avatarUrl: subject.avatarUrl,
    }
  }
  return {
    id: ownerId,
    name: 'Former owner',
  }
}

export function replaceGoal(goals: Goal[], nextGoal: Goal): Goal[] {
  return goals.map((goal) => (goal.id === nextGoal.id ? nextGoal : goal))
}

export function removeGoal(goals: Goal[], goalId: string): Goal[] {
  return goals.filter((goal) => goal.id !== goalId)
}

function resetMeasurement(measurement: Measurement): Measurement {
  if (measurement.kind === 'milestone') {
    return {
      ...measurement,
      id: newId('m'),
      complete: false,
      progressLog: [],
    }
  }
  return {
    ...measurement,
    id: newId('m'),
    currentValue: measurement.startValue,
    progressLog: [],
  }
}

/** Fresh copy of a goal for duplicate/cascade — no progress or comments. */
export function resetGoalProgress(goal: Goal): Goal {
  return {
    ...goal,
    id: newId('goal'),
    comments: [],
    measurements: goal.measurements.map(resetMeasurement),
    updatedAt: new Date().toISOString(),
  }
}

/** Carry a previous-cycle goal forward as a clean, independent draft. */
export function copyGoalToNewCycle(goal: Goal, ownerId: string): Goal {
  const {
    cascadedFromGoalId: _cascadedFromGoalId,
    linkedGoalLabel: _linkedGoalLabel,
    ...copy
  } = resetGoalProgress(goal)
  return {
    ...copy,
    ownerId,
  }
}

export function duplicateGoal(
  source: Goal,
  options: {
    ownerId: string
    sourceTitle: string
  },
): Goal {
  const reset = resetGoalProgress(source)
  return {
    ...reset,
    description: `${options.sourceTitle} (copy)`,
    ownerId: options.ownerId,
    cascadedFromGoalId: source.cascadedFromGoalId,
    linkedGoalLabel: source.linkedGoalLabel,
  }
}

/** Placeholder child linked to a parent — title only; recipient sets measures. */
export function cascadeGoal(
  source: Goal,
  targetPersonId: string,
  options: {
    sourceTitle: string
    sourcePersonName: string
  },
): Goal {
  return {
    ...blankGoal({ ownerId: targetPersonId }),
    description: `Untitled Cascading Goal from ${options.sourcePersonName}`,
    cascadedFromGoalId: source.id,
    linkedGoalLabel: options.sourceTitle,
    comments: [],
    updatedAt: new Date().toISOString(),
  }
}
